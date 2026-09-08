import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { extractTextFromPdfContentItems } from './documentTextExtraction';
import { isAthenaPortabilityDocument, parseTab14IntakeDocument } from './tab14DocumentParse';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const haroldPdf = join(root, 'test-fixtures/dummyPDFs/harold_jennings_medical_record.pdf');

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

describe('Harold Jennings Athena Data Portability PDF', () => {
  it('detects Athena portability and fills core clinical sections', async () => {
    const text = await extractPdfText(haroldPdf);
    expect(isAthenaPortabilityDocument(text)).toBe(true);

    const r = parseTab14IntakeDocument(text);
    expect(r.patientFields.givenName).toBe('Harold');
    expect(r.patientFields.familyName).toBe('Jennings');
    expect(r.patientFields.dateOfBirth).toBe('1968-05-14');
    expect(r.patientFields.sexAtBirth).toBe('Male');

    expect(r.allergies.length).toBeGreaterThanOrEqual(2);
    expect(r.allergies.some((a) => /penicillin/i.test(a.allergyName))).toBe(true);
    expect(r.allergies.some((a) => /shellfish/i.test(a.allergyName))).toBe(true);

    expect(r.medications.length).toBeGreaterThanOrEqual(8);
    expect(r.medications.some((m) => /metformin/i.test(m.genericName))).toBe(true);
    expect(r.medications.some((m) => /lisinopril/i.test(m.genericName))).toBe(true);
    expect(r.medications.some((m) => /atorvastatin/i.test(m.genericName))).toBe(true);
    expect(r.medications.some((m) => /cholecalciferol|vitamin\s*d/i.test(m.genericName))).toBe(
      true
    );

    expect(r.chronicConditions.length).toBeGreaterThanOrEqual(4);
    expect(
      r.chronicConditions.some((c) => /diabetes/i.test(c.conditionName) && /E11/i.test(c.icdCode))
    ).toBe(true);
    expect(r.chronicConditions.every((c) => !/OFFICE\/OUTPT|text\/html/i.test(c.conditionName))).toBe(
      true
    );

    expect(r.insurances.length).toBeGreaterThanOrEqual(1);
    const ins = r.insurances[0];
    expect(ins.providerName).toMatch(/Rocky\s*Mtn|Health/i);
    expect(ins.providerName.length).toBeLessThan(80);
    expect(ins.memberID).toMatch(/RMH/i);
    expect(ins.groupNumber).toMatch(/GRP/i);

    expect(r.vitalsHistory?.length).toBeGreaterThanOrEqual(3);
    expect(Number(r.patientFields.systolicBp)).toBeGreaterThan(100);
    expect(Number(r.patientFields.weightLbs)).toBeGreaterThan(100);

    expect(r.labPanels.length).toBeGreaterThanOrEqual(1);
    expect(
      r.labPanels.some((p) =>
        p.components.some((c) => /a1c|hemoglobin/i.test(c.name) || /glucose/i.test(c.name))
      )
    ).toBe(true);

    const pot = r.extendedSections?.planOfTreatment ?? [];
    expect(pot.length).toBeGreaterThanOrEqual(15);
    expect(pot.filter((e) => e.category === 'Lab').length).toBeGreaterThanOrEqual(10);
    expect(pot.some((e) => /Hemoglobin A1c/i.test(e.title))).toBe(true);
    expect(pot.some((e) => /Comprehensive metabolic/i.test(e.title))).toBe(true);
    expect(pot.some((e) => /Lipid panel/i.test(e.title))).toBe(true);
    expect(pot.every((e) => !/^Not Available\b/i.test(e.title))).toBe(true);
    expect(pot.filter((e) => e.category === 'Medication').length).toBeGreaterThanOrEqual(4);
    expect(pot.some((e) => /^metformin\b/i.test(e.title))).toBe(true);
    expect(pot.some((e) => /^lisinopril\b/i.test(e.title))).toBe(true);
    expect(pot.some((e) => /^atorvastatin\b/i.test(e.title))).toBe(true);
    expect(pot.some((e) => /^gabapentin\b/i.test(e.title))).toBe(true);
    expect(pot.filter((e) => e.category === 'Vaccine').length).toBeGreaterThanOrEqual(2);
    expect(pot.some((e) => /Influenza vaccine/i.test(e.title))).toBe(true);
    expect(pot.some((e) => /COVID-19 vaccine/i.test(e.title))).toBe(true);

    const care = r.extendedSections?.careTeam ?? [];
    expect(care.length).toBeGreaterThanOrEqual(3);
    expect(care.some((e) => /Susan\s+Cole/i.test(e.title) && e.npi === '1922384750')).toBe(true);
    expect(care.some((e) => /David\s+Nkemelu/i.test(e.title) && /Endocrinology/i.test(e.specialty || e.detail))).toBe(
      true
    );
    expect(
      care.some((e) => /Rocky\s+Mountain\s+Eye/i.test(e.title) && e.npi === '1749283610')
    ).toBe(true);

    const members = r.extendedSections?.careTeamMembers ?? [];
    expect(members.length).toBeGreaterThanOrEqual(1);
    expect(members[0]?.title).toMatch(/Susan\s+Cole/i);
    expect(members[0]?.phone).toMatch(/303|555-7100/);
  });
});
