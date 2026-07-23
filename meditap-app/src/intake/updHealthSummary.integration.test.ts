import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { extractTextFromPdfContentItems } from './documentTextExtraction';
import { isEpicHealthSummaryDocument } from './epicHealthSummaryParse';
import { parseTab14IntakeDocument } from './tab14DocumentParse';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const FIXTURE = join(root, 'test-fixtures/dummyPDFs/upd-My-Health-Summary.pdf');

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

describe('upd My Health Summary PDF', () => {
  it('extracts Joanna Smith Epic health summary for Tab14', async () => {
    const text = await extractPdfText(FIXTURE);
    expect(isEpicHealthSummaryDocument(text)).toBe(true);
    const r = parseTab14IntakeDocument(text);

    expect(r.patientFields.givenName).toBe('Joanna');
    expect(r.patientFields.familyName).toBe('Smith');
    expect(r.patientFields.dateOfBirth).toBe('2004-09-14');
    expect(r.patientFields.sexAtBirth).toBe('Female');
    expect(r.patientFields.preferredLanguage).toMatch(/English/i);
    expect(r.patientFields.race).toBe('White');
    expect(r.patientFields.ethnicity).toBe('Unknown');
    expect(r.patientFields.maritalStatus).toBe('Never Married');
    expect(r.patientFields.address).toMatch(/123 Duffy Dr/i);
    expect(r.patientFields.address).toMatch(/Albany, NY 12054/);
    expect(r.patientFields.email).toBe('Personalemail@gmail.com');
    expect(r.patientFields.additionalEmails?.some((e) => /emergencycontact@gmail\.com/i.test(e))).toBe(
      true
    );
    expect(r.patientFields.phoneNumber).toMatch(/555-555-555/);
    expect(r.patientFields.heightInches).toBe('67');
    expect(r.patientFields.weightLbs).toBe('140');
    expect(r.patientFields.systolicBp).toBe('120');
    expect(r.patientFields.diastolicBp).toBe('80');
    expect(r.patientFields.heartRate).toBe('83');

    expect(r.noKnownDrugAllergies).toBe(true);
    expect(r.allergies).toHaveLength(0);

    expect(r.medications.length).toBeGreaterThanOrEqual(1);
    const ceph = r.medications.find((m) => /cephalexin/i.test(m.genericName));
    expect(ceph).toBeTruthy();
    expect(ceph?.dosage).toMatch(/500\s*mg/i);

    expect(r.chronicConditions.length).toBeGreaterThanOrEqual(2);
    expect(r.chronicConditions.some((c) => /abdominal pain/i.test(c.conditionName))).toBe(true);
    expect(r.chronicConditions.some((c) => /ovarian cyst/i.test(c.conditionName))).toBe(true);

    expect(r.hospitalVisit.visitDate).toBe('2025-09-23');
    expect(r.hospitalVisit.visitType).toMatch(/Emergency/i);
    expect(r.hospitalVisit.facilityName).toMatch(/Cayuga Medical Center/i);
    expect(r.hospitalVisit.reason).toMatch(/Abdominal Pain/i);
    expect(r.hospitalVisit.attendingPhysician).toMatch(/Caelyn Bellerose/i);

    expect(r.insurances[0]?.providerName).toMatch(/BLUE CROSS/i);
    expect(r.insurances[0]?.groupNumber).toBe('105');
    expect(r.insurances[0]?.memberID).toBe('');
    expect(r.insurances[0]?.payerId).toBeTruthy();

    expect(r.labPanels.some((p) => /CBC|Complete Blood/i.test(p.testName))).toBe(true);
    expect(r.labPanels.some((p) => /CMP|Metabolic/i.test(p.testName))).toBe(true);
    expect(
      r.labPanels.some(
        (p) => p.category === 'imaging' && /appendicitis|cyst|pelvis|abdomen/i.test(p.impression ?? p.testName)
      )
    ).toBe(true);
  });
});
