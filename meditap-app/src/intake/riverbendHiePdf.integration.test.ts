/**
 * Integration: Riverbend HIE synthetic PDFs → Tab14 parser.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { extractTextFromPdfContentItems } from './documentTextExtraction';
import { isRiverbendHieDocument } from './riverbendHieParse';
import { parseTab14IntakeDocument } from './tab14DocumentParse';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const FIXTURE_DIR = join(root, 'test-fixtures/riverbend');

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

describe('Riverbend HIE PDF integration', () => {
  it('parses Lucas Martinez pediatric packet', async () => {
    const text = await extractPdfText(
      join(FIXTURE_DIR, '07_Pediatric_GrowthImmunization_Lucas_Martinez.pdf')
    );
    expect(isRiverbendHieDocument(text)).toBe(true);
    const r = parseTab14IntakeDocument(text);
    expect(r.patientFields.givenName).toBe('Lucas');
    expect(r.patientFields.familyName).toBe('Martinez');
    expect(r.patientFields.dateOfBirth).toBe('2018-03-05');
    expect(r.patientFields.sexAtBirth).toBe('Male');
    expect(r.chronicConditions.length).toBeGreaterThan(0);
    expect(r.chronicConditions.some((c) => /asthma/i.test(c.conditionName))).toBe(true);
    expect(r.hospitalVisit.facilityName).toMatch(/North Valley|Riverbend|Community/i);
  });

  it('parses Amina Hassan oncology packet', async () => {
    const text = await extractPdfText(
      join(FIXTURE_DIR, '08_Oncology_ChemoPathology_Amina_Hassan.pdf')
    );
    const r = parseTab14IntakeDocument(text);
    expect(r.patientFields.givenName).toBe('Amina');
    expect(r.patientFields.familyName).toBe('Hassan');
    expect(r.patientFields.dateOfBirth).toBe('1961-01-29');
    expect(r.patientFields.sexAtBirth).toBe('Female');
    expect(r.patientFields.preferredLanguage).toBe('Arabic');
    expect(r.chronicConditions.some((c) => /ductal carcinoma|breast/i.test(c.conditionName))).toBe(
      true
    );
  });

  it('parses Rafael Santos cardiology packet', async () => {
    const text = await extractPdfText(
      join(FIXTURE_DIR, '09_Cardiology_ECG_Echo_Rafael_Santos.pdf')
    );
    const r = parseTab14IntakeDocument(text);
    expect(r.patientFields.givenName).toBe('Rafael');
    expect(r.patientFields.familyName).toBe('Santos');
    expect(r.patientFields.dateOfBirth).toBe('1955-08-08');
    expect(r.patientFields.bloodType).toBe('AB+');
    expect(r.patientFields.phoneNumber).toBe('(713) 555-0902');
    expect(r.medications.length).toBeGreaterThanOrEqual(2);
    expect(r.medications.some((m) => /carvedilol/i.test(m.genericName))).toBe(true);
  });

  it('parses Tessa Robinson mixed provider packet', async () => {
    const text = await extractPdfText(
      join(FIXTURE_DIR, '10_MixedProviderPacket_Tessa_Robinson.pdf')
    );
    const r = parseTab14IntakeDocument(text);
    expect(r.patientFields.givenName).toBe('Tessa');
    expect(r.patientFields.familyName).toBe('Robinson');
    expect(r.patientFields.dateOfBirth).toBe('1999-09-19');
    expect(r.patientFields.address).toMatch(/Austin,\s*TX/i);
    expect(r.medications.length).toBeGreaterThan(0);
    expect(r.hospitalVisit.visitType).toMatch(/urgent care/i);
  });
});
