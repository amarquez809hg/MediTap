import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { extractTextFromPdfContentItems } from './documentTextExtraction';
import { parseAthenaPastEncounters, parseTab14IntakeDocument } from './tab14DocumentParse';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const haroldPdf = join(root, 'test-fixtures/dummyPDFs/harold_jennings_medical_record.pdf');

describe('Harold Past Encounters Date/Type/Performer/Notes', () => {
  it('parses OFFICE/OUTPT rows without Encounter IDs', async () => {
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

    const visits = parseAthenaPastEncounters(text);
    expect(visits.length).toBeGreaterThanOrEqual(5);
    expect(visits.every((v) => !v.encounterId)).toBe(true);
    expect(visits[0]?.visitDate).toBe('2025-02-11');
    expect(visits[0]?.visitType).toMatch(/OFFICE\/OUTPT/i);
    expect(visits[0]?.attendingPhysician).toMatch(/Susan\s+Cole/i);
    expect(visits[0]?.facilityName).toMatch(/Front\s+Range\s+Family/i);
    expect(visits[0]?.diagnosisNote).toMatch(/metformin|glucose|endocrinology/i);

    const fromDoc = parseTab14IntakeDocument(text).hospitalVisits ?? [];
    expect(fromDoc.length).toBeGreaterThanOrEqual(5);
    expect(fromDoc.some((v) => /Nkemelu/i.test(v.attendingPhysician || ''))).toBe(true);
  });
});
