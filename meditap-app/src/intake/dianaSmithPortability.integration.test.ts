import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { applyTab14ParseBundle, emptyMergeSnapshot } from './applyTab14ParseBundle';
import { extractTextFromPdfContentItems } from './documentTextExtraction';
import { parseTab14IntakeDocument } from './tab14DocumentParse';

const root = join(dirname(fileURLToPath(import.meta.url)), '../..');
const dianaPdf = join(root, 'test-fixtures/dummyPDFs/diana_smith_medical_record.pdf');

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

describe('Diana Smith Athena Data Portability PDF', () => {
  it('keeps medications out of allergies and fills vitals', async () => {
    const text = await extractPdfText(dianaPdf);
    const r = parseTab14IntakeDocument(text);

    expect(r.patientFields.givenName).toBe('Diana');
    expect(r.patientFields.familyName).toBe('Smith');

    expect(r.allergies.length).toBeGreaterThanOrEqual(1);
    expect(r.allergies.length).toBeLessThanOrEqual(3);
    const allergyNames = r.allergies.map((a) => a.allergyName.toLowerCase());
    expect(allergyNames.some((n) => /pollen/i.test(n))).toBe(true);
    expect(allergyNames.every((n) => !/\d+\s*mg\b/i.test(n))).toBe(true);
    expect(allergyNames.every((n) => !/dicyclomine|fluoxetine|cephalexin/i.test(n))).toBe(
      true
    );
    const pollen = r.allergies.find((a) => /pollen/i.test(a.allergyName));
    expect(pollen?.allergyName).toMatch(/POLLEN EXTRACTS/i);
    expect(pollen?.allergenId).toBe('1469239');
    expect(pollen?.code).toBe('235616');
    expect(pollen?.codeSystem).toBe('RxNorm');
    expect(pollen?.category).toMatch(/environment/i);
    expect(pollen?.recordedBy).toMatch(/Geraldine\s+Escobar/i);

    expect(r.medications.length).toBeGreaterThanOrEqual(8);
    const medNames = r.medications.map((m) => m.genericName.toLowerCase()).join(' | ');
    expect(medNames).toMatch(/dicyclomine/);
    expect(medNames).toMatch(/fluoxetine/);
    expect(medNames).toMatch(/cephalexin/);
    // Full Athena medication table — no wrapped-name junk rows
    expect(r.medications.length).toBe(16);
    const names = r.medications.map((m) => m.genericName);
    expect(names.some((n) => /neomycin-polymyxin-dexameth/i.test(n))).toBe(true);
    expect(names.some((n) => /triamcinolone\s+acetonide/i.test(n))).toBe(true);
    expect(names.some((n) => /methenamine\s+hippurate/i.test(n))).toBe(true);
    expect(names.some((n) => /nitrofurantoin\s+monohydrate\/macrocrystals/i.test(n))).toBe(
      true
    );
    expect(names.some((n) => /Tri-Lo-Marzia/i.test(n))).toBe(true);
    expect(names.some((n) => /azithromycin/i.test(n))).toBe(true);
    expect(names.some((n) => /prednisone/i.test(n))).toBe(true);
    expect(names.every((n) => !/gram\s+\d{1,2}:|monohydrate\/macrocrystals\d|^\s*dexameth\s*$/i.test(n))).toBe(
      true
    );
    // Two fluoxetine strengths must both appear
    expect(r.medications.filter((m) => /fluoxetine/i.test(m.genericName)).length).toBe(2);

    expect(r.noKnownProblems).toBe(true);
    expect(r.chronicConditions).toHaveLength(1);
    expect(r.chronicConditions[0].conditionName).toMatch(/no\s+known\s+problems/i);

    expect(Number(r.patientFields.heightInches)).toBeGreaterThan(60);
    expect(Number(r.patientFields.heightInches)).toBeLessThan(72);
    expect(Number(r.patientFields.weightLbs)).toBeGreaterThan(100);
    expect(r.patientFields.systolicBp).toBe('110');
    expect(r.patientFields.diastolicBp).toBe('76');
    expect(r.patientFields.heartRate).toBe('92');
    expect(r.patientFields.bodyMassIndex).toBe('19.8');

    // Multiple dated vitals → history for the Vitals dropdown (newest first)
    expect(r.vitalsHistory?.length).toBeGreaterThanOrEqual(3);
    const dates = (r.vitalsHistory ?? []).map((v) => v.recordedDate);
    expect(dates[0]).toBe('2026-01-12');
    expect(dates).toContain('2025-11-26');
    expect(dates).toContain('2025-08-21');
    const aug = r.vitalsHistory!.find((v) => v.recordedDate === '2025-08-21');
    expect(aug?.systolicBp).toBe('112');
    expect(aug?.diastolicBp).toBe('78');
    expect(aug?.bmiPercentile).toBe('64');
    expect(aug?.recordedBy).toMatch(/Sandra Galvez/i);
    const nov = r.vitalsHistory!.find((v) => v.recordedDate === '2025-11-26');
    expect(nov?.heartRate).toBe('97');
    expect(nov?.bodyMassIndex).toBe('21.1');
  });

  it('maps Payers section into Insurance tab fields', async () => {
    const text = await extractPdfText(dianaPdf);
    const r = parseTab14IntakeDocument(text);

    expect(r.insurances.length).toBeGreaterThanOrEqual(1);
    const ins = r.insurances[0];
    expect(ins.providerName).toMatch(/BCBS/i);
    expect(ins.groupNumber).toBe('105');
    expect(ins.memberID).toMatch(/R58531407/i);
    expect(ins.payerId).toBe('326758');
    expect(ins.relationToSubscriber).toMatch(/family\s+dependent/i);
    expect(ins.subscriberName).toMatch(/Robert/i);
    expect(ins.guarantor).toMatch(/Diana\s+Smith/i);
    expect(ins.startDate).toBe('2026-01-08');
    // Must not keep header junk from the generic insurance scraper
    expect(ins.providerName).not.toMatch(/Organization Details/i);
    expect(ins.memberID).not.toMatch(/^Subscriber$/i);
  });

  it('fills extended Add Patient Information sections from the PDF', async () => {
    const text = await extractPdfText(dianaPdf);
    const r = parseTab14IntakeDocument(text);
    expect(r.extendedSections).toBeTruthy();
    const ext = r.extendedSections!;
    // At least several non-legacy portability panels should get content
    const filled = Object.values(ext).filter((rows) => rows.length > 0).length;
    expect(filled).toBeGreaterThanOrEqual(4);

    // Assessment must not swallow Mental Status PHQ rows
    expect(ext.assessment.every((e) => !/little interest|feeling down|PHQ-?\d/i.test(e.title))).toBe(
      true
    );
    expect(ext.assessment.some((e) => /none recorded/i.test(e.title))).toBe(true);

    // Procedures top-level is empty in Athena; Surgical History holds the pelvic US row
    expect(ext.procedures.every((e) => !/akumin|med\s+time\s+pharmacy/i.test(e.title))).toBe(true);
    expect(ext.procedures.some((e) => /none recorded/i.test(e.title))).toBe(true);
    expect(ext.surgicalHistory.some((e) => /ultrasound|pelvic/i.test(e.title))).toBe(true);
    expect(ext.imagingResults.length).toBeGreaterThanOrEqual(2);
    expect(ext.imagingResults.every((e) => /pelvis|transvaginal|US/i.test(e.title))).toBe(true);
    expect(ext.procedureNotes.some((e) => /none recorded/i.test(e.title))).toBe(true);

    const little = ext.mentalStatus.find((e) => /little interest/i.test(e.title));
    expect(little).toBeTruthy();
    expect(little!.detail.toLowerCase()).toBe('not at all');
    expect(little!.date).toBeTruthy();
    expect(little!.title).not.toMatch(/12:20:19|Sandra Galvez/i);
    expect(little!.time).toMatch(/\d{1,2}:\d{2}:\d{2}/);

    // Stress Q + 3 full PHQ batteries (score + 10 items each) across encounter dates
    expect(ext.mentalStatus.length).toBeGreaterThanOrEqual(30);
    const mentalDates = [...new Set(ext.mentalStatus.map((e) => e.date).filter(Boolean))];
    expect(mentalDates).toEqual(
      expect.arrayContaining(['08/21/2025', '11/26/2025', '01/12/2026'])
    );
    expect(ext.mentalStatus.filter((e) => /PHQ/i.test(e.title)).length).toBe(3);
    expect(ext.mentalStatus.some((e) => /feel stressed/i.test(e.title))).toBe(true);

    const nicotine = [...ext.socialHistory, ...ext.functionalStatus].find((e) =>
      /tobacco or nicotine/i.test(e.title)
    );
    expect(nicotine).toBeTruthy();
    expect(nicotine!.detail).toBe('No');
    expect(nicotine!.date).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}/);
    expect(nicotine!.recordedBy).toMatch(/Sandra Galvez/i);
    expect(nicotine!.place).toMatch(/TX\s*-\s*Tenet/i);
    expect(nicotine!.time).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    expect(nicotine!.detail).not.toMatch(/Sandra|Tenet|12:17/i);
    expect(nicotine!.notes).not.toMatch(/Sandra Galvez|TX\s*-\s*Tenet/i);

    const smoking = [...ext.socialHistory, ...ext.functionalStatus].find(
      (e) =>
        /Tobacco Smoking Status/i.test(e.title) || /Never\s+Smoker/i.test(e.detail)
    );
    if (smoking) {
      expect(smoking.detail).toMatch(/Never\s+Smoker/i);
      expect(smoking.date).toBeTruthy();
      expect(smoking.recordedBy).toMatch(/Sandra Galvez|Galvez/i);
      expect(smoking.place).toMatch(/TX\s*-\s*Tenet/i);
    }

    // Related Person: name + phones + email + ZIP (not truncated contact line)
    expect(ext.relatedPerson.length).toBeGreaterThanOrEqual(1);
    const related = ext.relatedPerson[0];
    expect(related.title).toMatch(/DIANA SMITH/i);
    expect(related.phone).toMatch(/555/);
    expect(related.email).toMatch(/diana\.smith\.record@example\.com/i);
    expect(related.address).toMatch(/100 MAPLE STREET/i);
    expect(related.address).toMatch(/73301/);
    expect(related.detail).not.toMatch(/Phone:|Email:|Address:/i);

    // Care Team Members (early card) vs Care Team (end NPI table)
    expect(ext.careTeamMembers.length).toBeGreaterThanOrEqual(1);
    expect(ext.careTeamMembers.every((e) => !/none recorded/i.test(e.title))).toBe(true);
    const members = ext.careTeamMembers[0];
    expect(members.title).toMatch(/Peralta/i);
    expect(members.phone).toMatch(/915|533-7400/);
    expect(members.address).toMatch(/1733 Curie|El Paso/i);
    expect(members.role).toMatch(/Primary Care Provider/i);

    expect(ext.careTeam.length).toBeGreaterThanOrEqual(1);
    expect(ext.careTeam.every((e) => !/none recorded/i.test(e.title))).toBe(true);
    expect(ext.careTeam.every((e) => !/no assessment recorded/i.test(e.detail))).toBe(true);
    const care = ext.careTeam[0];
    expect(care.title).toMatch(/Peralta/i);
    expect(care.phone).toMatch(/915|533-7400/);
    expect(care.address).toMatch(/1733 Curie|El Paso/i);
    expect(care.role).toMatch(/Primary Care Provider/i);
    expect(care.npi).toBe('1184694978');
    expect(care.memberId).toBe('1465256');
    // Plan of Treatment: lab/imaging titles (not provider names) + med instructions
    expect(ext.planOfTreatment.length).toBeGreaterThanOrEqual(10);
    expect(
      ext.planOfTreatment.every((e) => !/Jennifer Marie Orr, MD ELP/i.test(e.title))
    ).toBe(true);
    const dipstick = ext.planOfTreatment.find((e) => /urinalysis,\s*dipstick/i.test(e.title));
    expect(dipstick).toBeTruthy();
    expect(dipstick!.recordedBy).toMatch(/Orr/i);
    expect(dipstick!.date).toMatch(/01\/12\/2026/);
    expect(dipstick!.place).toMatch(/ELP_ACWHP|1800 N\. Mesa/i);
    const imaging = ext.planOfTreatment.find((e) => /pelvis|transvaginal/i.test(e.title));
    expect(imaging).toBeTruthy();
    const med = ext.planOfTreatment.find((e) => /methenamine/i.test(e.title));
    expect(med).toBeTruthy();
    expect(med!.detail).toMatch(/90 days/i);

    // Patient Instructions section (between Plan of Treatment and Reason for Referral)
    expect(ext.patientInstructions.length).toBeGreaterThanOrEqual(3);
    expect(
      ext.patientInstructions.some((e) => /dysuria|birth control|bacterial vaginosis/i.test(e.title))
    ).toBe(true);
    expect(ext.patientInstructions[0].recordedBy).toMatch(/Orr/i);
    expect(ext.patientInstructions.some((e) => /^\d{6,}$/.test(e.encounterId ?? ''))).toBe(true);
  });

  it('captures Athena document columns as dedicated entry fields', async () => {
    const text = await extractPdfText(dianaPdf);
    const r = parseTab14IntakeDocument(text);
    const ext = r.extendedSections!;

    // Family History: relationship column split out of the condition name
    const mother = ext.familyHistory.find((e) => /^mother$/i.test(e.relationship ?? ''));
    expect(mother).toBeTruthy();
    expect(mother!.title).toMatch(/hyperlipidemia/i);
    expect(mother!.recordedBy).toMatch(/gescobar20/i);
    expect(mother!.date).toBe('11/26/2025');
    expect(
      ext.familyHistory.some((e) => /maternal grandfather/i.test(e.relationship ?? ''))
    ).toBe(true);

    // Medical History checklist: one entry per condition with its Y/N response
    expect(ext.medicalHistory.length).toBeGreaterThanOrEqual(40);
    const anxiety = ext.medicalHistory.find((e) => /^anxiety$/i.test(e.title));
    expect(anxiety).toBeTruthy();
    expect(anxiety!.response).toBe('Y');
    expect(ext.medicalHistory.find((e) => /^UTI$/i.test(e.title))?.response).toBe('N');
    // Section-name splitting must not eat the start of a condition
    expect(ext.medicalHistory.some((e) => /^Eye Problems/i.test(e.title))).toBe(true);

    // Obstetrics History sits between Medical History and Immunizations
    expect(ext.obstetricsHistory.length).toBeGreaterThanOrEqual(1);
    const gpal = ext.obstetricsHistory.find((e) => /^GPAL$/i.test(e.title));
    expect(gpal).toBeTruthy();
    expect(gpal!.detail).toMatch(/G\s*0\s*P\s*0\s*0\s*0\s*0/i);
    expect(
      ext.obstetricsHistory.some((e) =>
        /gynecological/i.test(e.title) && /no gynecological history recorded/i.test(e.detail)
      )
    ).toBe(true);

    // Immunizations
    const gardasil = ext.immunizations.find((e) => /gardasil/i.test(e.title));
    expect(gardasil).toBeTruthy();
    expect(gardasil!.status).toBe('active');
    expect(gardasil!.place).toMatch(/AthenaHealth/i);
    expect(gardasil!.date).toBe('08/21/2025');
    expect(gardasil!.time).toBe('13:27:48');

    // Notes holds the clinical notes, not the Social History Q&A table
    expect(ext.notes.length).toBeGreaterThanOrEqual(3);
    expect(ext.notes.some((e) => /NEW GYN|OCP|ovarian cyst|dysuria/i.test(e.detail))).toBe(true);
    expect(ext.notes.every((e) => !/Tobacco Smoking Status/i.test(e.title))).toBe(true);
    expect(ext.notes[0].noteType).toBe('text/html');
    expect(ext.notes[0].recordedBy).toMatch(/Orr/i);

    // Social History keeps the Q&A rows plus the observation sub-table
    const smoking = ext.socialHistory.find((e) => /Tobacco Smoking Status/i.test(e.title));
    expect(smoking).toBeTruthy();
    expect(smoking!.detail).toMatch(/Never\s+Smoker/i);
    expect(ext.socialHistory.some((e) => /^gender identity$/i.test(e.title))).toBe(true);

    // Advance Directives answers the social question instead of alcohol/tobacco rows
    expect(ext.advanceDirectives.length).toBe(1);
    expect(ext.advanceDirectives[0].title).toMatch(/advance directive/i);
    expect(ext.advanceDirectives[0].response).toBe('N');
    expect(
      ext.advanceDirectives.every((e) => !/alcohol|tobacco/i.test(e.title))
    ).toBe(true);

    // Health Concerns is empty in the document
    expect(ext.healthConcerns.some((e) => /none recorded/i.test(e.title))).toBe(true);

    // Contact columns promoted out of the readable detail block
    const related = ext.relatedPerson[0];
    expect(related.phone).toMatch(/555/);
    expect(related.email).toBe('diana.smith.record@example.com');
    expect(related.address).toMatch(/100 MAPLE STREET/i);

    const care = ext.careTeam[0];
    expect(care.npi).toBe('1184694978');
    expect(care.memberId).toBe('1465256');
    expect(care.role).toMatch(/Primary Care Provider/i);
    expect(care.phone).toMatch(/533-7400/);

    // Statuses / categories on the remaining panels
    expect(ext.surgicalHistory.some((e) => /completed/i.test(e.status ?? ''))).toBe(true);
    expect(ext.imagingResults.every((e) => e.status === 'Completed')).toBe(true);
    expect(ext.planOfTreatment.some((e) => e.category === 'Lab')).toBe(true);
    expect(ext.planOfTreatment.some((e) => e.category === 'Imaging')).toBe(true);
    expect(
      ext.planOfTreatment.find((e) => /methenamine/i.test(e.title))?.instructions
    ).toMatch(/90 days/i);
    expect(ext.mentalStatus.find((e) => /PHQ/i.test(e.title))?.score).toBe('0');

    // Gender identity / sexual orientation reach the demographics fields
    expect(r.patientFields.genderIdentity).toMatch(/female/i);
    expect(r.patientFields.sexualOrientation).toMatch(/bisexual/i);
  });

  it('registers every Past Encounter as its own hospital visit', async () => {
    const text = await extractPdfText(dianaPdf);
    const r = parseTab14IntakeDocument(text);

    const visits = r.hospitalVisits ?? [];
    expect(visits.length).toBe(3);
    const ids = visits.map((v) => v.encounterId);
    expect(ids).toContain('19280018');
    expect(ids).toContain('19896429');
    expect(ids).toContain('20136826');

    const first = visits.find((v) => v.encounterId === '19280018')!;
    expect(first.reason).toBe('Vulvovaginitis');
    expect(first.icd10).toBe('N76.0');
    expect(first.snomed).toBe('53277000');
    expect(first.imo).toBe('30862');
    expect(first.visitDate).toBe('2025-08-21');
    expect(first.startDateTime).toBe('08/21/2025 12:02:44');
    expect(first.closedDateTime).toBe('08/21/2025 14:46:57');
    expect(first.attendingPhysician).toMatch(/Jennifer Marie Orr, MD/i);
    expect(first.location).toMatch(/ELP_ACWHP/i);
    expect(first.visitType).toMatch(/PREVENTIVE MED/i);
    expect(first.diagnosisNote).toMatch(/Swab obtained/i);
    // Column bleed from the wrapped type / performer columns must stay out of the note
    expect(first.diagnosisNote).not.toMatch(/INITIAL NEW PT|Marie Orr|\d{2}:\d{2}:\d{2}/);

    const last = visits.find((v) => v.encounterId === '20136826')!;
    expect(last.reason).toBe('Dysuria');
    expect(last.dischargeDate).toBe('2026-01-13');

    // Backwards-compatible singular field still points at an encounter
    expect(r.hospitalVisit.encounterId).toBe('19280018');
  });

  it('merges all parsed encounters into the Tab14 snapshot', async () => {
    const text = await extractPdfText(dianaPdf);
    const r = parseTab14IntakeDocument(text);
    const { snapshot, stats } = applyTab14ParseBundle(emptyMergeSnapshot(), r);

    expect(snapshot.hospitalVisits.length).toBe(3);
    expect(stats.hospitalVisitsAdded).toBeGreaterThanOrEqual(2);
    expect(snapshot.hospitalVisits.map((v) => v.encounterId)).toContain('20136826');
  });

  it('registers Athena demographics completely into Tab14 fields', async () => {
    const text = await extractPdfText(dianaPdf);
    const r = parseTab14IntakeDocument(text);
    const f = r.patientFields;

    expect(f.givenName).toBe('Diana');
    expect(f.familyName).toBe('Smith');
    expect(f.dateOfBirth).toBe('1974-02-22');
    expect(f.sexAtBirth).toBe('Female');
    expect(f.legalSex).toBe('Female');
    expect(f.race).toBe('White');
    expect(f.ethnicity).toBe('Hispanic or Latino');
    expect(f.preferredLanguage).toBe('English');
    // Must match Tab14 <select> option exactly (not raw "Never married")
    expect(f.maritalStatus).toBe('Never Married');
    expect(f.address).toMatch(/100 MAPLE STREET/i);
    expect(f.address).toMatch(/AUSTIN,\s*TX/i);
    expect(f.phoneNumber).toMatch(/555/);
    expect(f.email).toMatch(/diana\.smith\.record@example\.com/i);
    // No labeled blood type in Athena demographics — do not invent from med names
    expect(f.bloodType ?? '').toBe('');
  });

  it('fills Results tab lab panels from Athena Results section', async () => {
    const text = await extractPdfText(dianaPdf);
    const r = parseTab14IntakeDocument(text);

    expect(r.labPanels.length).toBeGreaterThanOrEqual(4);
    expect(r.labPanels.every((p) => p.testName.trim().length > 0)).toBe(true);
    // Collapsed UI titles use testName — never leave generic blank/"UA/M" fragments.
    expect(r.labPanels.every((p) => p.testName !== 'UA/M')).toBe(true);

    const swab = r.labPanels.find((p) => /sureswab/i.test(p.testName));
    expect(swab).toBeTruthy();
    expect(swab!.components.length).toBeGreaterThanOrEqual(4);
    expect(
      swab!.components.some(
        (c) => /candida|trichomonas|chlamydia|neisseria|vagin/i.test(c.name)
      )
    ).toBe(true);

    const ua = r.labPanels.find(
      (p) => /urinalysis/i.test(p.testName) && !/UA\/M/i.test(p.testName)
    );
    expect(ua).toBeTruthy();
    expect(ua!.components.some((c) => /leukocytes|nitrites|color|clarity|pH/i.test(c.name))).toBe(
      true
    );

    const uam = r.labPanels.find((p) => /UA\/M/i.test(p.testName));
    expect(uam).toBeTruthy();
    expect(uam!.components.length).toBeGreaterThanOrEqual(8);

    const imaging = r.labPanels.filter((p) => p.category === 'imaging');
    expect(imaging.length).toBeGreaterThanOrEqual(1);
    expect(imaging.some((p) => /pelvis|transvaginal|transabdominal/i.test(p.testName))).toBe(
      true
    );
    expect(imaging.every((p) => p.status === 'Final')).toBe(true);
  });
});
