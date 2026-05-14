import type { PDFDocumentProxy } from 'pdfjs-dist';

const SPARSE_PDF_CHAR_THRESHOLD = 100;

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
