import { describe, expect, it } from 'vitest';
import {
  PORTABILITY_PDF_SECTIONS,
  TAB14_PORTABILITY_NAV,
  countExtendedEntries,
  normalizePortabilityGluedDates,
  parseCareTeamTableEntries,
  parseExtendedSectionsFromDocument,
  parseImagingResultsEntries,
  parseMentalStatusEntries,
  parseObstetricsHistoryEntries,
  parsePatientInstructionsEntries,
  parsePlanOfTreatmentEntries,
  parseProcedureNotesEntries,
  parseProceduresSectionEntries,
  parseQuestionAnswerEntries,
  parseRelatedPersonOrCareTeamEntries,
  parseSurgicalHistoryEntries,
  splitAthenaAnswerMetadata,
} from './tab14PortabilitySections';
import { parseTab14IntakeDocument } from './tab14DocumentParse';

describe('Tab14 portability section map', () => {
  it('covers Athena Data Portability TOC sections plus Patient Instructions', () => {
    expect(PORTABILITY_PDF_SECTIONS.length).toBeGreaterThanOrEqual(26);
    const covered = new Set(TAB14_PORTABILITY_NAV.flatMap((s) => s.pdfSections));
    for (const name of PORTABILITY_PDF_SECTIONS) {
      expect(covered.has(name)).toBe(true);
    }
    expect(TAB14_PORTABILITY_NAV.some((s) => s.key === 'patientInstructions')).toBe(true);
    expect(TAB14_PORTABILITY_NAV.some((s) => s.key === 'surgicalHistory')).toBe(true);
    expect(TAB14_PORTABILITY_NAV.some((s) => s.key === 'imagingResults')).toBe(true);
    expect(TAB14_PORTABILITY_NAV.some((s) => s.key === 'procedureNotes')).toBe(true);
    expect(TAB14_PORTABILITY_NAV.some((s) => s.key === 'obstetricsHistory')).toBe(true);
    expect(TAB14_PORTABILITY_NAV.some((s) => s.key === 'careTeamMembers')).toBe(true);
    expect(TAB14_PORTABILITY_NAV.some((s) => s.key === 'careTeam')).toBe(true);
    const membersIdx = TAB14_PORTABILITY_NAV.findIndex((s) => s.key === 'careTeamMembers');
    const relatedIdx = TAB14_PORTABILITY_NAV.findIndex((s) => s.key === 'relatedPerson');
    const assessIdx = TAB14_PORTABILITY_NAV.findIndex((s) => s.key === 'assessment');
    expect(relatedIdx).toBeLessThan(membersIdx);
    expect(membersIdx).toBeLessThan(assessIdx);
    expect(TAB14_PORTABILITY_NAV.at(-1)?.key).toBe('careTeam');
    const medIdx = TAB14_PORTABILITY_NAV.findIndex((s) => s.key === 'medicalHistory');
    const obIdx = TAB14_PORTABILITY_NAV.findIndex((s) => s.key === 'obstetricsHistory');
    const immIdx = TAB14_PORTABILITY_NAV.findIndex((s) => s.key === 'immunizations');
    expect(medIdx).toBeGreaterThanOrEqual(0);
    expect(obIdx).toBe(medIdx + 1);
    expect(immIdx).toBe(obIdx + 1);
    expect(TAB14_PORTABILITY_NAV.length).toBeGreaterThanOrEqual(25);
  });

  it('parses Athena Obstetrics / Gynecological History GPAL without false substring matches', () => {
    const rows = parseObstetricsHistoryEntries(
      'No gynecological history recorded. Obstetrics History GPAL: G 0 P 0 0 0 0'
    );
    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.title === 'Gynecological History')?.detail).toBe(
      'No gynecological history recorded'
    );
    expect(rows.find((r) => r.title === 'GPAL')?.detail).toBe('G 0 P 0 0 0 0');
  });

  it('splits answer, recorder, place, date, and time into separate fields', () => {
    const split = splitAthenaAnswerMetadata(
      'No Sandra Galvez TX - Tenet Texas 08/21/2025 12:17:49'
    );
    expect(split.detail).toBe('No');
    expect(split.date).toBe('08/21/2025');
    expect(split.recordedBy).toBe('Sandra Galvez');
    expect(split.place).toMatch(/TX\s*-\s*Tenet Texas/i);
    expect(split.time).toBe('12:17:49');
    expect(split.notes).toBe('');

    const rows = parseQuestionAnswerEntries(`
Social History
Question Answer Notes LastModified by Organization Details LastModified Time
Do you or have you ever used any other forms of tobacco or nicotine? No Sandra Galvez TX - Tenet Texas 08/21/2025 12:17:49
Do you or have you ever used any illicit or recreational drugs? No Sandra Galvez TX - Tenet Texas 08/21/2025 12:17:49
Tobacco Smoking Status Never Smoker Sandra Galvez TX - Tenet Texas 08/21/2025 12:17:49
What is your exercise level? Occasional Geraldine Escobar TX - Tenet Texas 11/26/2025 16:20:46
`);
    expect(rows.length).toBeGreaterThanOrEqual(3);
    const tobacco = rows.find((r) => /other forms of tobacco/i.test(r.title));
    expect(tobacco?.detail).toBe('No');
    expect(tobacco?.date).toBe('08/21/2025');
    expect(tobacco?.recordedBy).toBe('Sandra Galvez');
    expect(tobacco?.place).toMatch(/TX\s*-\s*Tenet Texas/i);
    expect(tobacco?.time).toBe('12:17:49');
    expect(tobacco?.detail).not.toMatch(/Sandra|Tenet|12:17/i);
    expect(tobacco?.notes).toBe('');

    const smoking = rows.find((r) => /Tobacco Smoking Status/i.test(r.title));
    expect(smoking?.detail).toMatch(/Never Smoker/i);
    expect(smoking?.date).toBe('08/21/2025');
    expect(smoking?.recordedBy).toBe('Sandra Galvez');
  });

  it('extracts extended sections from Diana-style portability text', () => {
    const text = `
Data Portability for Diana Smith Table of Contents
Demographics Related Person Care Team Members Assessment
Social History
Question Answer Notes
Tobacco Smoking Status Never Smoker
Are you currently employed? Yes
Functional Status
Do you or have you ever used any illicit or recreational drugs? No
What is your exercise level? Occasional
Medical Equipment
None Reported.
Immunizations
Gardasil 9 (PF) 0.5 mL 08/21/2025
Notes
08/21/2025 Clinical note for well woman exam.
Payers Insurance Sequence Insurance Name
`;
    const ext = parseExtendedSectionsFromDocument(text);
    expect(ext.socialHistory.length).toBeGreaterThanOrEqual(1);
    expect(ext.functionalStatus.length).toBeGreaterThanOrEqual(1);
    expect(ext.medicalEquipment.length).toBeGreaterThanOrEqual(1);
    expect(countExtendedEntries(ext)).toBeGreaterThanOrEqual(3);

    const r = parseTab14IntakeDocument(text);
    expect(r.extendedSections).toBeTruthy();
    expect(countExtendedEntries(r.extendedSections!)).toBeGreaterThanOrEqual(1);
  });

  it('keeps Assessment empty/none and puts PHQ rows under Mental Status', () => {
    const text = `
Assessment
No assessment recorded.
Plan of Treatment
Reminders Order
Functional Status
No Functional SDOH screeners recorded
Mental Status Question Answer Note LastModified by Organization Details LastModified Time
Do you feel stressed (tense, restless, nervous, or anxious, or unable to sleep at night)? Only a little Geraldine Escobar TX - Tenet Texas 1
Date Assessment Value LastModified Organization LastModified
by Details Time
08/21/2025PHQ-2/PHQ-9 0 Sandra Galvez TX - Tenet 08/21/2025
Texas 12:20:19
08/21/2025Little interest or pleasure in doing things Not at Sandra Galvez TX - Tenet 08/21/2025
all Texas 12:20:19
08/21/2025Feeling down, depressed, or hopeless Not at Sandra Galvez TX - Tenet 08/21/2025
all Texas 12:20:19
Family History
None recorded.
`;
    const ext = parseExtendedSectionsFromDocument(text);
    expect(ext.assessment).toHaveLength(1);
    expect(ext.assessment[0].title).toMatch(/none recorded/i);
    expect(ext.assessment.every((e) => !/little interest/i.test(e.title))).toBe(true);

    expect(ext.mentalStatus.length).toBeGreaterThanOrEqual(3);
    const little = ext.mentalStatus.find((e) => /little interest/i.test(e.title));
    expect(little).toBeTruthy();
    expect(little!.title).toMatch(/^Little interest/i);
    expect(little!.title).not.toMatch(/Sandra Galvez|12:20:19/i);
    expect(little!.detail.toLowerCase()).toBe('not at all');
    expect(little!.date).toBe('08/21/2025');
    expect(little!.recordedBy).toMatch(/Sandra Galvez/i);
    expect(little!.place).toMatch(/TX\s*-\s*Tenet/i);
    expect(little!.time).toMatch(/\d{1,2}:\d{2}:\d{2}/);

    const phq = ext.mentalStatus.find((e) => /PHQ/i.test(e.title));
    expect(phq?.detail).toMatch(/score:\s*0/i);
    expect(phq?.recordedBy).toMatch(/Sandra Galvez/i);
    expect(phq?.time).toMatch(/\d{1,2}:\d{2}:\d{2}/);
  });

  it('captures Related Person phones, email, and full address', () => {
    const block = `
Related Person
Name DIANA SMITH
Relation
Phone Number tel:+1-(555) 010-0000 tel:+1-(555) 010-0000 mailto:diana.smith.record@example.com
Address 100 MAPLE STREET, AUSTIN, TX 73301-0000
`;
    const rows = parseRelatedPersonOrCareTeamEntries(block, 'Related Person');
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toMatch(/DIANA SMITH/i);
    expect(rows[0].relationship).toBe('');
    expect(rows[0].phone).toMatch(/555.*010-0000/i);
    expect(rows[0].email).toMatch(/diana\.smith\.record@example\.com/i);
    expect(rows[0].address).toMatch(/100 MAPLE STREET.*73301-0000/i);
    expect(rows[0].detail).toBe('');
    // Date / Recorded by / Place / Time are not in Athena Related Person cards
    expect(rows[0].date).toBe('');
    expect(rows[0].recordedBy).toBe('');

    const care = parseRelatedPersonOrCareTeamEntries(
      `Care Team Members Primary Care Provider Max Peralta 1733 Curie Dr, Ste 105, El Paso, TX 79902 Ph. tel: (915) 533-7400`,
      'Care Team Members'
    );
    expect(care).toHaveLength(1);
    expect(care[0].title).toMatch(/Max Peralta/i);
    expect(care[0].phone).toMatch(/915.*533-7400/);
    expect(care[0].address).toMatch(/1733 Curie Dr.*79902/i);
    expect(care[0].role).toMatch(/Primary Care Provider/i);
    expect(care[0].detail).toBe('');

    const table = parseCareTeamTableEntries(
      `Care Team Name Role Member ID NPI Specialty Address Phone
MAX A PERALTA MD Primary Care Provider 1465256 1184694978 1733 Curie Dr,Ste 105, El Paso, TX (915) 533-7400`
    );
    expect(table).toHaveLength(1);
    expect(table[0].title).toMatch(/PERALTA/i);
    expect(table[0].memberId).toBe('1465256');
    expect(table[0].npi).toBe('1184694978');
    expect(table[0].phone).toMatch(/915.*533-7400/);
    expect(table[0].detail).toBe('');
    const haroldTable = parseCareTeamTableEntries(
      `Care Team Name Role NPI Specialty Address Phone
Susan Cole, MD Primary Care Provider 1922384750 Family Medicine 3210 Larimer St, Ste 220, Denver, CO 80205 (303) 555-7100
David Nkemelu, MD Specialist 1837465920 Endocrinology 4400 E 9th Ave, Ste 300, Denver, CO 80220 (303) 555-2200
Rocky Mountain Eye Associates Specialist - Ophthalmology 1749283610 Ophthalmology 1155 Cherokee St, Denver, CO 80204 (303) 555-4410`
    );
    expect(haroldTable).toHaveLength(3);
    expect(haroldTable.map((r) => r.title).join('|')).toMatch(/Susan Cole/i);
    expect(haroldTable.map((r) => r.title).join('|')).toMatch(/David Nkemelu/i);
    expect(haroldTable.map((r) => r.title).join('|')).toMatch(/Rocky Mountain Eye/i);
    expect(haroldTable.find((r) => /Susan/i.test(r.title))?.npi).toBe('1922384750');
    expect(haroldTable.find((r) => /David/i.test(r.title))?.specialty).toMatch(/Endocrinology/i);
    expect(haroldTable.find((r) => /Rocky/i.test(r.title))?.role).toMatch(/Ophthalmology/i);

    const text = `
Demographics
Related Person
Name DIANA SMITH Relation Phone Number tel:+1-(555) 010-0000 tel:+1-(555) 010-0000 mailto:diana.smith.record@example.com Address 100 MAPLE STREET, AUSTIN, TX 73301-0000
Care Team Members
Primary Care Provider Max Peralta 1733 Curie Dr, Ste 105, El Paso, TX 79902 Ph. tel: (915) 533-7400
Assessment
No assessment recorded.
Notes
Visit note example.
Care Team Name Role Member ID NPI Specialty Address Phone
MAX A PERALTA MD Primary Care Provider 1465256 1184694978 1733 Curie Dr,Ste 105, El Paso, TX (915) 533-7400
`;
    const ext = parseExtendedSectionsFromDocument(text);
    expect(ext.relatedPerson[0]?.email).toMatch(/diana\.smith\.record@example\.com/i);
    expect(ext.relatedPerson[0]?.address).toMatch(/73301-0000/);
    expect(ext.relatedPerson[0]?.detail).toBe('');
    expect(ext.careTeamMembers).toHaveLength(1);
    expect(ext.careTeamMembers[0]?.title).toMatch(/Peralta/i);
    expect(ext.careTeamMembers[0]?.phone).toMatch(/915|533-7400/);
    expect(ext.careTeamMembers.every((e) => !/\bNPI:/i.test(e.detail))).toBe(true);
    expect(ext.careTeam).toHaveLength(1);
    expect(ext.careTeam[0]?.title).toMatch(/Peralta/i);
    expect(ext.careTeam[0]?.npi).toBe('1184694978');
    expect(ext.careTeam[0]?.detail).toBe('');
    expect(ext.careTeam.every((e) => !/none recorded/i.test(e.title))).toBe(true);
    expect(TAB14_PORTABILITY_NAV.findIndex((s) => s.key === 'careTeamMembers')).toBeLessThan(
      TAB14_PORTABILITY_NAV.findIndex((s) => s.key === 'assessment')
    );
    expect(TAB14_PORTABILITY_NAV[TAB14_PORTABILITY_NAV.length - 1]?.key).toBe('careTeam');
  });

  it('normalizes glued dates before field split', () => {
    expect(normalizePortabilityGluedDates('08/21/2025Little interest')).toBe(
      '08/21/2025 Little interest'
    );
    expect(normalizePortabilityGluedDates('12:20:1908/21/2025')).toBe(
      '12:20:19 08/21/2025'
    );
    expect(normalizePortabilityGluedDates('01/12/202601/12/2026')).toBe(
      '01/12/2026 01/12/2026'
    );
    const rows = parseMentalStatusEntries(
      '08/21/2025Little interest or pleasure in doing things Not at Sandra Galvez TX - Tenet 08/21/2025\nall Texas 12:20:1908/21/2025Feeling down'
    );
    const little = rows.find((r) => /Little interest/i.test(r.title));
    expect(little).toBeTruthy();
    expect(little!.detail.toLowerCase()).toBe('not at all');
    expect(little!.date).toBe('08/21/2025');
    expect(little!.time).toBe('12:20:19');
    expect(little!.recordedBy).toMatch(/Sandra Galvez/i);
  });

  it('parses Plan of Treatment labs, imaging, and medication orders', () => {
    const block = `
Plan of Treatment Reminders Order Submit Provider Name Organization Details
Appointments None recorded.
Lab urinalysis, dipstick 01/12/202601/12/2026 Jennifer Marie Orr, MD ELP_ACWHP - Mesa Jennifer Marie 01/12/2026
19:07:49 Orr, MD 19:07:49
1800 N. Mesa,Ste 200, EL PASO, TX, 79902-3554, Ph (915) 577-9900
hsv (1+2) igg, serum 08/21/202508/21/2025 Jennifer Marie Orr, MD Quest Diagnostics PSC Not Available 08/21/2025
13:03:36 13:03:54
840 E Redd Rd, El Paso, TX, 79912, Ph (915) 760-5053
Referral None recorded.
Procedures None recorded.
Surgeries None recorded.
Imaging US, pelvis, transabdominal + 08/21/202508/21/2025 Jennifer Marie Orr, MD Akumin Osborne Not Available 08/25/2025
transvaginal 13:21:59 18:39:51
4930 Osbourne,Ste H, El Paso, TX, 79922, Ph (915) 544-7300
MedicationOrdersmethenamine hippurate 1 gram 01/12/2026 Med Time Pharmacy Not Available Not available 01/12/2026 Take 1 tablet twice a
tablet 18:10:56 18:18:05 day by oral route for
641 N Resler Ste 306, El 90 days.
Paso, 79912, Ph
9155846337
VaccineOrders Gardasil 9 (PF) 0.5 mL 08/21/2025 Med Time Pharmacy Not Available Not available 08/21/2025 inject 0.5mL at 1, 2, 6
intramuscular suspension 13:20:05 13:27:48 months at pharmacy
641 N Resler Ste 306, El Paso, 79912, Ph 9155846337
`;
    const rows = parsePlanOfTreatmentEntries(block);
    expect(rows.some((r) => /urinalysis, dipstick/i.test(r.title))).toBe(true);
    const ua = rows.find((r) => /urinalysis, dipstick/i.test(r.title))!;
    expect(ua.detail).toMatch(/Lab order/i);
    expect(ua.date).toBe('01/12/2026');
    expect(ua.time).toBe('19:07:49');
    expect(ua.recordedBy).toMatch(/Jennifer Marie Orr,\s*MD/i);
    expect(ua.place).toMatch(/ELP_ACWHP/i);
    expect(ua.place).toMatch(/1800 N\. Mesa/i);
    expect(ua.title).not.toMatch(/Jennifer Marie/i);

    const img = rows.find((r) => /pelvis/i.test(r.title))!;
    expect(img.title).toMatch(/transvaginal/i);
    expect(img.detail).toMatch(/Imaging/i);
    expect(img.recordedBy).toMatch(/Orr/i);

    const med = rows.find((r) => /methenamine/i.test(r.title))!;
    expect(med.detail).toMatch(/90 days/i);
    expect(med.place).toMatch(/641 N Resler/i);
    expect(med.place).not.toMatch(/18:18/);

    const vax = rows.find((r) => /Gardasil/i.test(r.title))!;
    expect(vax.detail).toMatch(/1,\s*2,\s*6 months/i);

    expect(rows.every((r) => !/Jennifer Marie Orr, MD ELP/i.test(r.title))).toBe(true);
  });

  it('parses Harold-style flat PoT orders plus all MedicationOrders / VaccineOrders', () => {
    const block = `
Plan of Treatment Order Submit Date Provider Organization Details Status
Hemoglobin A1c, serum 02/11/2025 David Nkemelu, MD Mile High Endocrinology 4400 E 9th Ave 09:14:02 Not Available
Comprehensive metabolic panel 02/11/2025 David Nkemelu, MD Mile High Endocrinology 09:14:10 Not Available
Lipid panel 02/11/2025 David Nkemelu, MD Mile High Endocrinology 09:14:14 Not Available
MedicationOrders metformin 500 mg tablet 02/11/2025 TAKE 1 tablet twice daily by mouth route for 90 days.
lisinopril 10 mg tablet 09/18/2025 TAKE 1 tablet once daily by mouth route for 90 days.
atorvastatin 20 mg tablet 09/18/2025 TAKE 1 tablet once daily at bedtime by mouth route for 90 days.
gabapentin 300 mg capsule 06/03/2026 TAKE 1 capsule three times daily by mouth route for 90 days.
VaccineOrders Influenza vaccine, quadrivalent 0.5 mL 10/02/2025 inject 0.5 mL intramuscular once
COVID-19 vaccine, bivalent 0.5 mL 11/14/2025 inject 0.5 mL intramuscular once
Patient Instructions
`;
    const rows = parsePlanOfTreatmentEntries(block);
    expect(rows.filter((r) => r.category === 'Lab').length).toBeGreaterThanOrEqual(3);
    expect(rows.some((r) => /^Hemoglobin A1c/i.test(r.title))).toBe(true);
    expect(rows.every((r) => !/^Not Available\b/i.test(r.title))).toBe(true);
    expect(rows.filter((r) => r.category === 'Medication').map((r) => r.title)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^metformin/i),
        expect.stringMatching(/^lisinopril/i),
        expect.stringMatching(/^atorvastatin/i),
        expect.stringMatching(/^gabapentin/i),
      ])
    );
    expect(rows.filter((r) => r.category === 'Vaccine').length).toBe(2);
  });

  it('parses Patient Instructions with encounter id and provider', () => {
    const block = `
Patient Instructions Encounter Date Encounter Id Patient Instructions LastModified by Organization Details Last Modified Time
01/12/2026 20136826 painful urination (dysuria): care instructions Jennifer Marie Orr, MD Not available 01/12/2026 17:57:25
learning about birth control: combination pills Jennifer Marie Orr, MD Not available 01/12/2026 17:57:25
11/26/2025 19896429 painful urination (dysuria): care instructions Jennifer Marie Orr, MD Not available 11/26/2025 16:43:38
08/21/2025 19280018 bacterial vaginosis: care instructions Jennifer Marie Orr, MD Not available 08/21/2025 12:59:33
`;
    const rows = parsePatientInstructionsEntries(block);
    expect(rows.length).toBeGreaterThanOrEqual(4);
    const dysuria = rows.find((r) => /dysuria/i.test(r.title) && r.date === '01/12/2026');
    expect(dysuria).toBeTruthy();
    expect(dysuria!.detail).toMatch(/Encounter ID:\s*20136826/);
    expect(dysuria!.recordedBy).toMatch(/Jennifer Marie Orr,\s*MD/i);
    expect(dysuria!.time).toBe('17:57:25');
    const birth = rows.find((r) => /birth control/i.test(r.title));
    expect(birth).toBeTruthy();
    expect(birth!.detail).toMatch(/20136826/);
    const bv = rows.find((r) => /bacterial vaginosis/i.test(r.title));
    expect(bv?.detail).toMatch(/19280018/);
  });

  it('keeps Procedures empty/none and puts Surgical History in its own section', () => {
    const text = `
Plan of Treatment
Procedures None recorded.
Surgeries None recorded.
Imaging US, pelvis, transabdominal + 08/21/2025 08/21/2025 Jennifer Marie Orr, MD Akumin Osborne Not Available 08/25/2025
transvaginal
Problems
No Known Problems
Procedures
Surgical History Date Name Laterality Status LastModified by Organization Details Recorded Time
01/12/2026 Ultrasound Pelvic (Transvaginal/Transabdominal) completed Jennifer Marie Orr, MD TX - Tenet Texas 01/12/2026 17:57:23
Imaging Results
08/21/2025 US, pelvis, transabdominal + completed Not Available Akumin
Procedure Notes
None recorded.
Medical Equipment
None Reported.
`;
    const ext = parseExtendedSectionsFromDocument(text);
    expect(ext.procedures).toHaveLength(1);
    expect(ext.procedures[0].title).toMatch(/none recorded/i);
    expect(ext.procedures.every((e) => !/akumin|med\s+time/i.test(e.title))).toBe(true);

    expect(ext.surgicalHistory.length).toBeGreaterThanOrEqual(1);
    expect(ext.surgicalHistory[0].title).toMatch(/ultrasound\s+pelvic/i);
    expect(ext.surgicalHistory[0].detail).toMatch(/completed/i);
    expect(ext.surgicalHistory[0].recordedBy).toMatch(/Orr/i);
    expect(ext.surgicalHistory[0].place).toMatch(/Tenet/i);
    expect(ext.surgicalHistory[0].time).toBe('17:57:23');

    const surg = parseSurgicalHistoryEntries(`
Surgical History Date Name Laterality Status
01/12/2026 Ultrasound Pelvic (Transvaginal/Transabdominal) completed Jennifer Marie Orr, MD TX - Tenet Texas 01/12/2026 17:57:23
`);
    expect(surg[0].title).toMatch(/Ultrasound Pelvic/i);

    const emptyProc = parseProceduresSectionEntries('Procedures\n');
    expect(emptyProc[0].title).toMatch(/none recorded/i);

    expect(ext.imagingResults.length).toBeGreaterThanOrEqual(1);
    expect(ext.imagingResults[0].title).toMatch(/pelvis|transvaginal/i);
    expect(ext.procedureNotes.some((e) => /none recorded/i.test(e.title))).toBe(true);

    const img = parseImagingResultsEntries(`
Imaging Results Imaging Name Status
08/21/2025 US, pelvis, transabdominal + completed Not Available Akumin Osborne transvaginal 02:31:14
01/11/2026 US, pelvis, transabdominal + completed Jennifer Marie Orr, MD Akumin Osborne transvaginal 19:24:42
`);
    expect(img.length).toBe(2);
    expect(img[0].place).toMatch(/Akumin/i);
    expect(img[1].recordedBy).toMatch(/Orr/i);

    expect(parseProcedureNotesEntries('Procedure Notes\nNone recorded.\n')[0].title).toMatch(
      /none recorded/i
    );
  });
});
