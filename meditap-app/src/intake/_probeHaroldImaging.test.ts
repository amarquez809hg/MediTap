import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { extractTextFromPdfContentItems } from './documentTextExtraction';
import { parseTab14IntakeDocument } from './tab14DocumentParse';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const haroldPdf = join(root, 'test-fixtures/dummyPDFs/harold_jennings_medical_record.pdf');

describe('Harold Imaging Results PDF fields', () => {
  it('parses Date / Imaging Name / Status / Detail without header junk', async () => {
    const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const data = new Uint8Array(readFileSync(haroldPdf));
    const pdf = await pdfjsLib.getDocument({
      data,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    }).promise;
    let text = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += `${extractTextFromPdfContentItems(content.items)}\n`;
    }

    const imaging = parseTab14IntakeDocument(text).extendedSections?.imagingResults ?? [];
    expect(imaging.length).toBe(2);
    expect(imaging.map((e) => e.title).join('|')).toMatch(/Chest X-ray/i);
    expect(imaging.map((e) => e.title).join('|')).toMatch(/Retinal photography/i);
    expect(imaging.every((e) => !/^status(\s+detail)?$/i.test(e.title))).toBe(true);
    expect(imaging.every((e) => !/^imaging\s+results$/i.test(e.notes || ''))).toBe(true);
  });
});
