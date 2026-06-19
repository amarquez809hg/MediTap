import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { extractTextFromPdfContentItems } from './documentTextExtraction';
import { parseTab14IntakeDocument } from './tab14DocumentParse';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');

async function extractPdfText(pdfPath: string): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const data = new Uint8Array(readFileSync(pdfPath));
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
  return text;
}

describe('Spanish + Rafael user PDFs', () => {
  it('parses Rafael Santos cardiology PDF', async () => {
    const text = await extractPdfText(
      join(root, 'test-fixtures/riverbend/09_Cardiology_ECG_Echo_Rafael_Santos.pdf')
    );
    const r = parseTab14IntakeDocument(text);
    expect(r.patientFields.givenName).toBe('Rafael');
    expect(r.patientFields.familyName).toBe('Santos');
    expect(r.patientFields.bloodType).toBe('AB+');
    expect(r.medications.length).toBeGreaterThanOrEqual(2);
  });

  it('parses Spanish MediTap registro PDF with full sections', async () => {
    const text = await extractPdfText(
      join(root, 'test-fixtures/Registro_Medico_MediTap_Espanol.pdf')
    );
    const r = parseTab14IntakeDocument(text);
    expect(r.patientFields.givenName).toBe('Riley');
    expect(r.patientFields.familyName).toBe('Moore');
    expect(r.patientFields.dateOfBirth).toBe('1997-03-22');
    expect(r.patientFields.sexAtBirth).toBe('Male');
    expect(r.patientFields.bloodType).toBe('O+');
    expect(r.allergies.length).toBeGreaterThanOrEqual(2);
    expect(r.medications.length).toBeGreaterThanOrEqual(4);
    expect(r.chronicConditions.length).toBeGreaterThanOrEqual(3);
    expect(r.insurances.length).toBeGreaterThanOrEqual(1);
  });
});
