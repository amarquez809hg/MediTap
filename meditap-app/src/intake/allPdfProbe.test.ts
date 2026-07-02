import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { extractTextFromPdfContentItems } from './documentTextExtraction';
import { parseTab14IntakeDocument } from './tab14DocumentParse';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

async function extractPdfText(pdfPath: string): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(readFileSync(pdfPath));
  const pdf = await pdfjsLib.getDocument({ data, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    text += `${extractTextFromPdfContentItems(content.items)}\n`;
  }
  return text;
}

const PDFS = [
  'test-fixtures/Jordan_Parker_MediTap_Demo_Record.pdf',
  'test-fixtures/Riley-Moore-Meditap-3.pdf',
  'test-fixtures/Registro_Medico_MediTap_Espanol.pdf',
  'test-fixtures/dummyPDFs/upd-My-Health-Summary.pdf',
  ...readdirSync(join(root, 'test-fixtures/riverbend')).filter((f) => f.endsWith('.pdf')).map((f) => `test-fixtures/riverbend/${f}`),
];

describe('all fixture PDF probe', () => {
  for (const rel of PDFS) {
    it(`parses ${rel.split('/').pop()} with patient identity`, async () => {
      const text = await extractPdfText(join(root, rel));
      expect(text.replace(/\s/g, '').length).toBeGreaterThan(100);
      const r = parseTab14IntakeDocument(text);
      expect(r.patientFields.givenName?.trim(), JSON.stringify(r.patientFields)).toBeTruthy();
      expect(r.patientFields.familyName?.trim()).toBeTruthy();
    });
  }
  it('parses Spanish registro PDF with full clinical sections', async () => {
    const text = await extractPdfText(join(root, 'test-fixtures/Registro_Medico_MediTap_Espanol.pdf'));
    const r = parseTab14IntakeDocument(text);
    expect(r.patientFields.givenName).toBe('Riley');
    expect(r.patientFields.familyName).toBe('Moore');
    expect(r.patientFields.dateOfBirth).toBe('1997-03-22');
    expect(r.patientFields.sexAtBirth).toBe('Masculino');
    expect(r.patientFields.maritalStatus).toBe('Soltero');
    expect(r.patientFields.bloodType).toBe('O+');
    expect(r.allergies.length).toBeGreaterThanOrEqual(2);
    expect(r.medications.length).toBeGreaterThanOrEqual(4);
    expect(r.chronicConditions.length).toBeGreaterThanOrEqual(3);
    expect(r.insurances.length).toBeGreaterThanOrEqual(1);
  });

});
