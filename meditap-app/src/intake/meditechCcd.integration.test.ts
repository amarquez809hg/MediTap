import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { athenaCompletenessFromParseResult } from './athenaPortabilityCompleteness';
import { extractTextFromPdfContentItems } from './documentTextExtraction';
import {
  isMeditechCcdDocument,
  parseMeditechAllergies,
  parseMeditechCareTeam,
  parseMeditechFamilyHistory,
  parseMeditechImmunizations,
  parseMeditechMedications,
  parseMeditechPastEncounters,
  parseMeditechPayers,
  parseMeditechPlanOfTreatment,
  preprocessMeditechCcdText,
} from './meditechCcdParse';
import {
  isAthenaPortabilityDocument,
  normalizeAthenaPortabilityText,
  parseTab14IntakeDocument,
} from './tab14DocumentParse';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const meditechPdf = join(root, 'test-fixtures/dummyPDFs/meditech_sample_ehr_record.pdf');
const priyaPdf = join(root, 'test-fixtures/dummyPDFs/meditech_priya_kapoor_medical_record.pdf');

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

describe('Meditech CCD dialect helpers', () => {
  const sample = `
SAMPLE / SYNTHETIC DATA MEDITECH MyHealth Patient Portal Continuity of Care Document (CCD) — Data Export
Patient Health Summary for Jordan A Rivera (DOB: 05/03/1990)
Allergies Allergen Name Allergen Category Reaction Reaction Severity Criticality Documentation Date
Penicillin medication Hives Moderate High 02/14/2026
Medications Name Sig Start Date Status Indication
lisinopril 10 mg tablet Take 1 tablet by mouth daily for 90 days. 04/02/2026 active Hypertension
atorvastatin 20 mg tablet Take 1 tablet by mouth nightly. 02/14/2026 active Hyperlipidemia
albuterol 90 mcg inhaler Inhale 2 puffs every 4-6 hours as needed. 02/14/2026 active Asthma
Vitals Date Recorded
Payers Insurance Date Sequence Insurance Name Group Identifier Policy Holder Relationship Covered Member ID Guarantor Name
04/01/2026 1 Sample Health PPO 883214 Jordan A Rivera self SMP99213401 Jordan A Rivera
Notes Date Note Type Note Provider Name
`;

  it('detects Meditech and not Athena', () => {
    expect(isMeditechCcdDocument(sample)).toBe(true);
    expect(isAthenaPortabilityDocument(sample)).toBe(false);
    expect(isAthenaPortabilityDocument(preprocessMeditechCcdText(sample))).toBe(true);
  });

  it('parses Meditech allergies, meds, and payers', () => {
    expect(parseMeditechAllergies(sample).map((a) => a.allergyName)).toEqual(['Penicillin']);
    expect(parseMeditechAllergies(sample)[0].criticality).toBe('High');
    expect(parseMeditechMedications(sample).map((m) => m.genericName)).toEqual([
      'lisinopril',
      'atorvastatin',
      'albuterol',
    ]);
    const payers = parseMeditechPayers(sample);
    expect(payers).toHaveLength(1);
    expect(payers[0].providerName).toMatch(/Sample Health PPO/i);
    expect(payers[0].memberID).toBe('SMP99213401');
  });

  it('keeps Order title clean when Organization Details contain "Diagnostics Lab"', () => {
    const priyaStyle = `
Plan of Treatment Reminders Order Date Provider Name Organization Details
Lab thyroid stimulating hormone (TSH) 03/09/2026 Alan Brooks, MD Capitol Diagnostics Lab, 2100 S Lamar Blvd, Austin, TX
Lab free T4 03/09/2026 Alan Brooks, MD Capitol Diagnostics Lab, 2100 S Lamar Blvd, Austin, TX
Imaging MRI brain, without contrast 01/16/2026 Alan Brooks, MD Austin Radiology Partners, 1901 S Lamar Blvd, Austin, TX
MedicationOrders levothyroxine 75 mcg tablet 03/09/2026 Hill Country Pharmacy, 2200 S Lamar Blvd, Austin, TX 78704 Take 1 tablet by mouth daily on an empty stomach for 90 days.
Reason for Referral None Reported.
`;
    const rows = parseMeditechPlanOfTreatment(priyaStyle);
    expect(rows.length).toBeGreaterThanOrEqual(4);
    const freeT4 = rows.find((e) => /^free\s*T4$/i.test(e.title.trim()));
    expect(freeT4).toBeTruthy();
    expect(freeT4!.title).not.toMatch(/Lamar|Capitol|Diagnostics/i);
    expect(freeT4!.category).toBe('Lab');
    expect(freeT4!.recordedBy).toMatch(/Alan Brooks/i);
    expect(freeT4!.place).toMatch(/Capitol Diagnostics/i);
    expect(freeT4!.detail).toBe('');
    expect(rows.some((e) => /thyroid stimulating hormone/i.test(e.title))).toBe(true);
    expect(rows.some((e) => /MRI brain/i.test(e.title) && e.category === 'Imaging')).toBe(true);
    expect(rows.some((e) => /levothyroxine/i.test(e.title) && e.category === 'MedicationOrders')).toBe(
      true
    );
    expect(rows.every((e) => !/^\s*,\s*\d/.test(e.title) && !/\bBlvd\b/i.test(e.title))).toBe(true);
  });
});

describe('Meditech sample EHR PDF — full section intake', () => {
  it('fills every TOC clinical section for Jordan A Rivera', async () => {
    const text = await extractPdfText(meditechPdf);
    expect(isMeditechCcdDocument(text)).toBe(true);
    expect(isAthenaPortabilityDocument(text)).toBe(false);

    const adapted = preprocessMeditechCcdText(normalizeAthenaPortabilityText(text));
    expect(parseMeditechPlanOfTreatment(adapted).length).toBeGreaterThanOrEqual(4);
    expect(parseMeditechCareTeam(adapted).some((e) => /WHITFIELD/i.test(e.title))).toBe(true);
    expect(parseMeditechFamilyHistory(adapted).map((e) => e.detail)).toEqual(
      expect.arrayContaining(['Father', 'Mother'])
    );
    expect(parseMeditechImmunizations(adapted).length).toBeGreaterThanOrEqual(2);
    expect(parseMeditechPastEncounters(adapted)).toHaveLength(2);

    const r = parseTab14IntakeDocument(text);
    expect(r.patientFields.givenName).toMatch(/Jordan/i);
    expect(r.patientFields.familyName).toBe('Rivera');
    expect(r.patientFields.dateOfBirth).toBe('1990-05-03');
    expect(r.patientFields.sexAtBirth).toBe('Male');
    expect(r.patientFields.maritalStatus).toBe('Married');
    expect(r.patientFields.preferredLanguage).toMatch(/English/i);
    expect(r.patientFields.phoneNumber).toMatch(/555-0142/);
    expect(r.patientFields.email ?? '').not.toMatch(/taylor\.rivera/i);

    expect(r.allergies.some((a) => /penicillin/i.test(a.allergyName))).toBe(true);
    expect(r.medications.length).toBeGreaterThanOrEqual(3);
    expect(r.noKnownProblems).toBe(true);
    expect(r.insurances.some((i) => /Sample Health/i.test(i.providerName))).toBe(true);

    expect(Number(r.patientFields.systolicBp)).toBe(124);
    expect(Number(r.patientFields.weightLbs)).toBeGreaterThan(150);

    expect(r.labPanels.filter((p) => p.category === 'lab').length).toBeGreaterThanOrEqual(2);
    expect(
      r.labPanels.some((p) =>
        p.components.some((c) => /glucose|creatinine|ldl|hdl/i.test(c.name))
      )
    ).toBe(true);

    const pot = r.extendedSections?.planOfTreatment ?? [];
    expect(pot.length).toBeGreaterThanOrEqual(4);
    expect(pot.filter((e) => e.category === 'Lab').length).toBeGreaterThanOrEqual(2);
    expect(pot.some((e) => e.category === 'Imaging')).toBe(true);
    expect(pot.some((e) => /lisinopril/i.test(e.title))).toBe(true);
    expect(pot.every((e) => !/\bBlvd\b/i.test(e.title) && !/^,\s*\d/.test(e.title))).toBe(true);
    expect(pot.some((e) => /Hospital\s+Lab|Riverside/i.test(e.place ?? ''))).toBe(true);

    expect((r.extendedSections?.careTeam ?? []).length).toBeGreaterThanOrEqual(1);
    expect((r.extendedSections?.careTeamMembers ?? []).length).toBeGreaterThanOrEqual(1);
    expect(r.extendedSections?.careTeam?.[0]?.npi).toMatch(/1972384561/);

    expect((r.extendedSections?.familyHistory ?? []).length).toBeGreaterThanOrEqual(2);
    expect((r.extendedSections?.immunizations ?? []).length).toBeGreaterThanOrEqual(2);
    expect((r.extendedSections?.medicalHistory ?? []).length).toBeGreaterThanOrEqual(8);
    expect((r.extendedSections?.notes ?? []).length).toBeGreaterThanOrEqual(2);
    expect((r.extendedSections?.imagingResults ?? [])[0]?.title).toMatch(/chest/i);

    expect(r.hospitalVisits?.length).toBe(2);
    expect(r.hospitalVisits?.[0]?.facilityName).toMatch(/Riverside/i);
    expect(r.hospitalVisits?.[0]?.reason).toMatch(/Hypertension/i);
    expect(r.hospitalVisits?.[0]?.attendingPhysician).not.toMatch(/Susan Susan/i);

    expect(r.patientFields.emergencyContactFamilyName).toMatch(/Rivera/i);

    const score = athenaCompletenessFromParseResult(r);
    expect(score.scorePercent, `gaps: ${score.gapLabels.join(', ')}`).toBeGreaterThanOrEqual(95);
    expect(score.gapLabels).toEqual([]);
  });
});

describe('Meditech Priya Kapoor PDF — Plan of Treatment', () => {
  it('parses free T4 Order without org address bleed', async () => {
    const text = await extractPdfText(priyaPdf);
    expect(isMeditechCcdDocument(text)).toBe(true);

    const r = parseTab14IntakeDocument(text, { preferredVendor: 'meditech' });
    expect(r.patientFields.givenName).toMatch(/Priya/i);
    expect(r.patientFields.familyName).toMatch(/Kapoor/i);

    const pot = r.extendedSections?.planOfTreatment ?? [];
    const freeT4 = pot.find((e) => /^free\s*T4$/i.test(e.title.trim()));
    expect(freeT4, `titles: ${pot.map((e) => e.title).join(' | ')}`).toBeTruthy();
    expect(freeT4!.title).not.toMatch(/Lamar|Capitol|Diagnostics|2100/i);
    expect(freeT4!.category).toBe('Lab');
    expect(freeT4!.recordedBy).toMatch(/Alan Brooks/i);
    expect(freeT4!.place).toMatch(/Capitol Diagnostics/i);
    expect(pot.every((e) => !/\bBlvd\b/i.test(e.title))).toBe(true);
  });
});
