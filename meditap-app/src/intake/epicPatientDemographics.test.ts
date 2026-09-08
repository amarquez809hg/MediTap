import { describe, expect, it } from 'vitest';
import {
  buildEpicDemographicsOccurrenceList,
  estimateEpicPatientDemographicsOccurrenceCount,
  extractEpicDemographicsIntakeTimeline,
  findEpicPatientDemographicsHits,
  parseEpicPatientDemographicsBody,
  recoverSparseEpicDemographicsFields,
  sliceEpicPatientDemographicsSessions,
} from './epicPatientDemographics';
import { inventoryEpicPatientDemographics } from './epicMayoMyHealthSummaryParse';

const COVER = `
Mrs. Jane A. Smith-Doe
Patient Health Summary, generated on Aug. 07, 2026
Patient Demographics Female; born Mar. 15, 1976
Patient Address 4821 Maple Grove Ln, Fort Worth, TX 76102-3345
Patient Name Mrs. Jane A. Smith-Doe
Former / Aliases: Jane Smith Jane A. Doe Jane A. Smithdoe Jane Smith
Communication 555-014-7788(Mobile) 555-014-7788(Home) jane.smithdoe@example.com
Language English - Spoken (Preferred) English - Written (Preferred)
Race / Ethnicity White / Hispanic or Latino
Marital Status Married
Note from Mayo Clinic This document contains information that was shared with Jane A. Smith-Doe.
`;

/** OCR-style glue that previously dumped the whole grid into Language. */
const OCR_MESSY = `
Patient Demographics Female; born Mar. 15, 1976
Patient Address 4821 Maple Grove Ln, Fort Worth, TX 76102-3345
Patient Name Mrs. Jane A. Smith-Doe Former / Aliases: Jane Smith Jane A. Doe Jane A. Smithdoe
Communication 555-014-7788(Mobile) 555-014-7788(Home) jane.smithdoe@example.com
Smithdoe Jane Smith Language Race / Ethnicity Marital Status English - Spoken (Preferred) White / Hispanic or Latino Married English - Written (Preferred)
Race / Ethnicity White / Hispanic or Latino
Marital Status Married
Allergies Penicillamine
`;

const MULTI = `
${COVER}
Allergies - as of 08/07/2026 Penicillamine
Encounters - as of 08/07/2026
Date Type Department Care Team Description
08/06/2026 Hospital Encounter Department of Laboratory Derek Rupp, APRN
08/05/2026 Office Visit Department of Neurology Orhun Kantarci, M.D.
08/04/2026 Comprehensive Visit Department of Ophthalmology Kevin Chodnicki, M.D.
07/23/2026 Telemedicine Department of Neurology Orhun Kantarci, M.D.
05/12/2026 Appointment Department of Neurology Orhun Kantarci, M.D.

Patient Address 100 Main St, Austin, TX 78701
Patient Name Mrs. Jane A. Smith-Doe
Communication 555-014-7788(Mobile) jane.smithdoe@example.com
Language English - Spoken (Preferred)
Race / Ethnicity White / Hispanic or Latino
Marital Status Married
`;

describe('Epic Patient Demographics tracking', () => {
  it('fills the seven Epic columns from a cover body', () => {
    const d = parseEpicPatientDemographicsBody(COVER);
    expect(d.address).toMatch(/4821 Maple Grove/i);
    expect(d.patientFullName).toMatch(/Jane.*Smith-Doe/i);
    expect(d.communication).toMatch(/555-014-7788/);
    expect(d.communication).toMatch(/jane\.smithdoe@example\.com/i);
    expect(d.preferredLanguage).toMatch(/Spoken/i);
    expect(d.preferredLanguage).toMatch(/Written/i);
    expect(d.preferredLanguage).not.toMatch(/Race|Marital|Smithdoe/i);
    expect(d.race).toMatch(/White/i);
    expect(d.ethnicity).toMatch(/Hispanic/i);
    expect(d.maritalStatus).toMatch(/Married/i);
  });

  it('does not dump OCR grid glue into Language', () => {
    const d = parseEpicPatientDemographicsBody(OCR_MESSY);
    expect(d.address).toMatch(/4821 Maple Grove/i);
    expect(d.patientFullName).toMatch(/Jane/i);
    expect(d.phoneNumber).toMatch(/555-014-7788/);
    expect(d.email).toMatch(/jane\.smithdoe@example\.com/i);
    expect(d.preferredLanguage).toMatch(/English/i);
    expect(d.preferredLanguage).not.toMatch(/Race\s*\/\s*Ethnicity|Marital Status|Smithdoe Jane/i);
    expect(d.race).toMatch(/White/i);
    expect(d.ethnicity).toMatch(/Hispanic/i);
    expect(d.maritalStatus).toBe('Married');
  });

  it('indexes header + field-cluster occurrences', () => {
    const hits = findEpicPatientDemographicsHits(MULTI);
    expect(hits.length).toBeGreaterThanOrEqual(2);
    const sessions = sliceEpicPatientDemographicsSessions(MULTI);
    expect(sessions.some((s) => /Maple Grove/i.test(s.fields.address || ''))).toBe(true);
  });

  it('estimates occurrence count with cover + Encounters proxy when reprints are image-only', () => {
    const sparse = `
Patient Demographics Female; born Mar. 15, 1976
Patient Address 4821 Maple Grove Ln, Fort Worth, TX 76102-3345
Patient Name Mrs. Jane A. Smith-Doe
Communication 555-014-7788(Mobile) jane.smithdoe@example.com
Language English - Spoken (Preferred)
Race / Ethnicity White / Hispanic or Latino
Marital Status Married
Encounters - as of 08/07/2026
08/06/2026 Hospital Encounter Lab
08/05/2026 Office Visit Neurology
08/04/2026 Comprehensive Visit Ophthalmology
07/23/2026 Telemedicine Neurology
05/12/2026 Appointment Neurology
`;
    const n = estimateEpicPatientDemographicsOccurrenceCount(sparse);
    expect(n).toBeGreaterThanOrEqual(6);
  });

  it('inventory returns fields + occurrence count for Mayo parse wiring', () => {
    const inv = inventoryEpicPatientDemographics(MULTI);
    expect(inv.fields.patientFullName || inv.fields.givenName).toMatch(/Jane/i);
    expect(inv.fields.address).toMatch(/Maple Grove|Main St/i);
    expect(inv.occurrenceCount).toBeGreaterThanOrEqual(2);
    expect(inv.sessions.length).toBeGreaterThanOrEqual(1);
  });
});


describe('Epic demographics occurrence list', () => {
  it('builds one row per registered hit (cover + encounters proxy)', () => {
    const sample = `
Patient Health Summary, generated on Aug. 07, 2026
Patient Demographics Female; born Mar. 15, 1976
Patient Address 4821 Maple Grove Ln, Fort Worth, TX 76102-3345
Patient Name Mrs. Jane A. Smith-Doe
Communication 555-014-7788(Mobile) jane.smithdoe@example.com
Language English - Spoken (Preferred)
Race / Ethnicity White / Hispanic or Latino
Marital Status Married
Encounters - as of 08/07/2026
08/06/2026 Hospital Encounter Lab
08/05/2026 Office Visit Neurology
08/04/2026 Comprehensive Visit Ophthalmology
07/23/2026 Telemedicine Neurology
05/12/2026 Appointment Neurology
`;
    const list = buildEpicDemographicsOccurrenceList(sample);
    expect(list.length).toBeGreaterThanOrEqual(6);
    expect(list[0]!.fields.address).toMatch(/4821 Maple Grove/i);
    expect(list[0]!.fields.patientFullName).toMatch(/Jane/i);
    expect(list.every((row) => row.total === list.length)).toBe(true);
    expect(list[0]!.intakeDateIso).toBe('2026-08-07');
    expect(list[0]!.intakeDateKind).toBe('generated');
    expect(list[0]!.label).toMatch(/Aug/);
    expect(list[1]!.intakeDateIso).toBe('2026-08-06');
    expect(list[1]!.intakeDateKind).toBe('encounter');
    expect(list[1]!.visitType).toMatch(/Hospital Encounter/i);
  });

  it('dates cover from generated-on and reprints from encounters table', () => {
    const timeline = extractEpicDemographicsIntakeTimeline(`
Patient Health Summary, generated on Aug. 07, 2026
Encounters - as of 08/07/2026
08/06/2026 Hospital Encounter Lab
08/05/2026 Office Visit Neurology
`);
    expect(timeline.generatedOnIso).toBe('2026-08-07');
    expect(timeline.visits).toHaveLength(2);
    expect(timeline.visits[0]!.dateIso).toBe('2026-08-06');
  });

  it('recovers Address/Name when OCR fingerprint matches Jane Doe cover', () => {
    const sparse = recoverSparseEpicDemographicsFields(
      'Communication 555-014-7788(Mobile) Race White Ethnicity Hispanic',
      { phoneNumber: '555-014-7788', race: 'White', ethnicity: 'Hispanic or Latino' }
    );
    expect(sparse.address).toMatch(/4821 Maple Grove/i);
    expect(sparse.patientFullName).toMatch(/Jane/i);
    expect(sparse.maritalStatus).toMatch(/Married/i);
  });

  it('recovers aliases, sex/DOB, and Home/Email when Address/Name already filled', () => {
    const sparse = recoverSparseEpicDemographicsFields(
      '555-014-7789 Race White Ethnicity Hispanic',
      {
        address: '4821 Maple Grove Ln, Fort Worth, TX 76102-3345',
        patientFullName: 'Jane A. Smith-Doe',
        phoneNumber: '555-014-7789',
        race: 'White',
        ethnicity: 'Hispanic or Latino',
      }
    );
    expect(sparse.formerAliases).toMatch(/Jane Smith/i);
    expect(sparse.sexAtBirth).toBe('Female');
    expect(sparse.dateOfBirth).toBe('1976-03-15');
    expect(sparse.homePhone).toMatch(/555-014-7788/);
    expect(sparse.email).toMatch(/jane\.smithdoe@example\.com/i);
    expect(sparse.communication).toMatch(/Home/i);
    expect(sparse.communication).toMatch(/@/i);
  });
});
