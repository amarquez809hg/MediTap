import { describe, expect, it } from 'vitest';
import { isSparseExtractedText } from './documentTextExtraction';
import {
  parseEpicMayoCoverDemographics,
  isEpicMayoMyHealthSummaryDocument,
} from './epicMayoMyHealthSummaryParse';
import { parseTab14IntakeDocument } from './tab14DocumentParse';

const COVER = `
Mrs. Jane A. Smith-Doe
Patient Health Summary, generated on Aug. 07, 2026
Patient Demographics Female; born Mar. 15, 1976
Patient Address 4821 Maple Grove Ln, Fort Worth, TX 76102-3345
Patient Name Mrs. Jane A. Smith-Doe
Former / Aliases: Jane Smith
Communication 555-014-7788(Mobile) 555-014-7788(Home) jane.smithdoe@example.com
Language English - Spoken (Preferred)
Race / Ethnicity White / Hispanic or Latino
Marital Status Married
Note from Mayo Clinic This document contains information that was shared with Jane A. Smith-Doe.
Allergies - as of 08/07/2026 Active Allergy Reactions Criticality Noted Date Comments Penicillamine Rash Medium 05/08/2026
Active Problems - as of 08/07/2026 Problem Noted Date Diagnosed Date Myelopathy 05/13/2026
Encounters - as of 08/07/2026 Date Type Department Care Team Description 08/06/2026 Hospital Encounter
Last Filed Vital Signs Medication SigDispense Mayo Clinic
`;

describe('Epic Mayo cover demographics', () => {
  it('parses Patient Demographics banner fields', () => {
    const d = parseEpicMayoCoverDemographics(COVER);
    expect(d.givenName).toMatch(/^Jane/i);
    expect(d.familyName).toMatch(/Smith-Doe/i);
    expect(d.patientFullName).toMatch(/Jane.*Smith-Doe/i);
    expect(d.dateOfBirth).toBe('1976-03-15');
    expect(d.sexAtBirth).toBe('Female');
    expect(d.address).toMatch(/4821 Maple Grove/i);
    expect(d.address).toMatch(/Fort Worth,\s*TX\s*76102/i);
    expect(d.phoneNumber).toMatch(/555-014-7788/);
    expect(d.email).toMatch(/jane\.smithdoe@example\.com/i);
    expect(d.communication).toMatch(/555-014-7788/);
    expect(d.preferredLanguage).toMatch(/English/i);
    expect(d.preferredLanguage).not.toMatch(/Race|Marital/i);
    expect(d.race).toMatch(/White/i);
    expect(d.ethnicity).toMatch(/Hispanic/i);
    expect(d.maritalStatus).toMatch(/Married/i);
    expect(d.formerAliases).toMatch(/Jane Smith/i);
    expect(d.homePhone).toMatch(/555-014-7788/);
  });

  it('fills Demographics via preferred Epic parse', () => {
    expect(isEpicMayoMyHealthSummaryDocument(COVER)).toBe(true);
    const r = parseTab14IntakeDocument(COVER, { preferredVendor: 'epic' });
    expect(r.patientFields.givenName).toMatch(/^Jane/i);
    expect(r.patientFields.familyName).toMatch(/Smith-Doe/i);
    expect(r.patientFields.dateOfBirth).toBe('1976-03-15');
    expect(r.patientFields.email).toMatch(/jane\.smithdoe@example\.com/i);
  });

  it('treats empty cover page text as sparse (OCR trigger)', () => {
    expect(isSparseExtractedText('')).toBe(true);
    expect(isSparseExtractedText('   ')).toBe(true);
  });
});
