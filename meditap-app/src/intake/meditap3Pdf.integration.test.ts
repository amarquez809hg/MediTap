/**
 * Integration: live PDF text extract (same pipeline as Tab14 upload) → parser.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { extractTextFromPdfContentItems } from './documentTextExtraction';
import { isMeditapDemoRecordDocument } from './meditapDemoRecordParse';
import { parseTab14IntakeDocument } from './tab14DocumentParse';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const FIXTURE_PDF = join(root, 'test-fixtures/Riley-Moore-Meditap-3.pdf');
const CACHED_EXTRACT = join(root, 'tmp-meditap3-extract.txt');

describe('Meditap-3 PDF integration', () => {
  it('parses text extracted from Riley Moore demo PDF', async () => {
    let text: string;
    try {
      const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
      const data = new Uint8Array(readFileSync(FIXTURE_PDF));
      const pdf = await pdfjsLib.getDocument({ data, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;
      text = '';
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        text += `${extractTextFromPdfContentItems(content.items)}\n`;
      }
      writeFileSync(CACHED_EXTRACT, text, 'utf8');
    } catch {
      text = readFileSync(CACHED_EXTRACT, 'utf8');
    }

    expect(isMeditapDemoRecordDocument(text)).toBe(true);

    const r = parseTab14IntakeDocument(text);
    expect(r.patientFields.givenName).toBe('Riley');
    expect(r.patientFields.familyName).toBe('Moore');
    expect(r.patientFields.dateOfBirth).toBe('1997-03-22');
    expect(r.noKnownDrugAllergies).toBe(false);
    expect(r.allergies.length).toBe(2);
    expect(r.medications.length).toBeGreaterThanOrEqual(4);
    expect(r.chronicConditions.length).toBeGreaterThanOrEqual(4);
    expect(r.insurances[0]?.providerName).toBe('Blue Cross Blue Shield of Texas');
    expect(r.insurances[0]?.startDate).toBe('2025-01-01');
    expect(r.hospitalVisit.facilityName).toBe('Lakeside Family Medicine');
    expect(r.hospitalVisit.visitDate).toBe('2026-04-18');
    expect(r.hospitalVisit.attendingPhysician).toMatch(/Marcus Hale/i);
  });
});
