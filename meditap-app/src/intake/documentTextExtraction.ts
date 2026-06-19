import * as pdfjsLib from 'pdfjs-dist';
import { GlobalWorkerOptions } from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import worker from 'pdfjs-dist/build/pdf.worker.mjs?url';

if (!GlobalWorkerOptions.workerSrc) {
  GlobalWorkerOptions.workerSrc = `${worker}?v=nginx-mjs-mime`;
}

const SPARSE_PDF_CHAR_THRESHOLD = 100;

/** Build page text with line breaks (pdf.js hasEOL) instead of one long glued string. */
export function extractTextFromPdfContentItems(items: unknown[]): string {
  let lastY: number | undefined;
  let buf = '';

  for (const raw of items) {
    if (!raw || typeof raw !== 'object') continue;
    const item = raw as { str?: string; hasEOL?: boolean; transform?: number[] };
    if (!('str' in item) || typeof item.str !== 'string') continue;
    const chunk = item.str;
    if (!chunk) continue;

    const transform = 'transform' in item && Array.isArray(item.transform) ? item.transform : null;
    const y = transform ? Number(transform[5]) : undefined;
    if (y !== undefined && lastY !== undefined && Math.abs(y - lastY) > 4) {
      buf += '\n';
    }
    if (lastY !== undefined && y !== undefined) lastY = y;

    if (buf.length > 0 && !buf.endsWith('\n') && !buf.endsWith(' ')) {
      const needsSpace =
        !/[\s:;,\-]$/.test(buf) && !/^[\s.,;:]/.test(chunk) && !chunk.startsWith('\n');
      if (needsSpace && !('hasEOL' in item && item.hasEOL)) buf += ' ';
    }

    buf += chunk;

    if ('hasEOL' in item && item.hasEOL) {
      buf += '\n';
    }
    if (chunk.includes('\n')) {
      buf = buf.replace(/\n+/g, '\n');
    }
  }

  return buf
    .split('\n')
    .map((l) => l.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

/**
 * Fix common OCR / PDF extraction spacing issues before field heuristics run.
 */
export function normalizeExtractedDocumentText(raw: string): string {
  let t = raw.replace(/\r\n/g, '\n');

  // "PatientName:" or "Name:Antonio" → add space after labels
  t = t.replace(
    /(\b(?:patient\s*)?(?:first|last|given|family|full)\s*name|name|d\.?o\.?b\.?|email|phone|blood\s*type|sex)\s*([:#])(?=\S)/gi,
    '$1$2 '
  );

  // lowercase-uppercase glue: "antonioMarquez" → "antonio Marquez" (not inside emails)
  const emails: string[] = [];
  t = t.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, (m) => {
    emails.push(m);
    return `__EMAIL_${emails.length - 1}__`;
  });
  t = t.replace(/([a-zà-ÿ])([A-ZÀ-Ÿ])/g, '$1 $2');
  t = t.replace(/__EMAIL_(\d+)__/g, (_, i) => emails[Number(i)] ?? '');

  t = t.replace(/[ \t]+/g, ' ');
  t = t.replace(/\n[ \t]+/g, '\n');
  t = t.replace(/[ \t]+\n/g, '\n');

  return t.trim();
}

/** True when the PDF likely has no text layer (scan) or extraction failed. */
export function isSparseExtractedText(text: string): boolean {
  return text.replace(/\s/g, '').length < SPARSE_PDF_CHAR_THRESHOLD;
}

/**
 * OCR a raster image (data URL or image element src). Loads tesseract.js on demand.
 */
export async function ocrImageDataUrl(dataUrl: string): Promise<string> {
  const { createWorker } = await import('tesseract.js');
  const worker = await createWorker('eng');
  try {
    const {
      data: { text },
    } = await worker.recognize(dataUrl);
    return (text || '').trim();
  } finally {
    await worker.terminate();
  }
}

/**
 * If extracted PDF text is very short, render page 1 to a canvas and OCR it
 * (common for scanned intake PDFs).
 */
export async function augmentPdfTextWithFirstPageOcr(
  extractedText: string,
  pdf: PDFDocumentProxy
): Promise<string> {
  if (!isSparseExtractedText(extractedText)) return extractedText;
  try {
    const page = await pdf.getPage(1);
    const viewport = page.getViewport({ scale: 2 });
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return extractedText;
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const renderTask = page.render({ canvasContext: ctx, viewport });
    await renderTask.promise;
    const dataUrl = canvas.toDataURL('image/png');
    const ocrText = await ocrImageDataUrl(dataUrl);
    if (!ocrText) return extractedText;
    return `${extractedText}\n\n${ocrText}`.trim();
  } catch {
    return extractedText;
  }
}

export async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}

export function isTab14UploadFileType(file: File): boolean {
  return file.type === 'application/pdf' || file.type.startsWith('image/');
}

async function loadPdfFromArrayBuffer(arrayBuffer: ArrayBuffer): Promise<PDFDocumentProxy> {
  const data = new Uint8Array(arrayBuffer);
  try {
    return await pdfjsLib.getDocument({ data }).promise;
  } catch {
    const legacy = await import('pdfjs-dist/legacy/build/pdf.mjs');
    return legacy.getDocument({
      data,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;
  }
}

/** Extract plain text from a Tab14 upload file (PDF with optional OCR, or image OCR). */
export async function extractTab14UploadFileText(file: File): Promise<string> {
  if (file.type === 'application/pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await loadPdfFromArrayBuffer(arrayBuffer);
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      fullText += `${extractTextFromPdfContentItems(content.items)}\n`;
    }
    return augmentPdfTextWithFirstPageOcr(fullText, pdf);
  }

  if (file.type.startsWith('image/')) {
    const dataUrl = await fileToDataUrl(file);
    return ocrImageDataUrl(dataUrl);
  }

  throw new Error('Unsupported file type');
}
