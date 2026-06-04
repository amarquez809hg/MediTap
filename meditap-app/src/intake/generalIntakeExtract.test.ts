import { describe, expect, it } from 'vitest';
import { parseGeneralIntakeDocument } from './generalIntakeExtract';
import { parseTab14IntakeDocument } from './tab14DocumentParse';

describe('parseGeneralIntakeDocument', () => {
  it('extracts Riverbend-style space-column demographics without bleeding into PROBLEMS', () => {
    const text = `Riverbend Health Information Exchange PATIENT DEMOGRAPHICS Child Name Lucas Martinez DOB 03/05/2018 Sex Male Guardian Ana Martinez School Not listed Insurance Missing GROWTH DATA Date Height Weight PROBLEMS Mild intermittent asthma. Seasonal allergies. MISSING FIELDS No blood type. No phone number. No full address.`;
    const r = parseTab14IntakeDocument(text);
    expect(r.patientFields.givenName).toBe('Lucas');
    expect(r.patientFields.familyName).toBe('Martinez');
    expect(r.patientFields.dateOfBirth).toBe('2018-03-05');
    expect(r.patientFields.sexAtBirth).toBe('Male');
    expect(r.chronicConditions.some((c) => /asthma/i.test(c.conditionName))).toBe(true);
  });

  it('extracts colon-labeled demographics', () => {
    const text = `DEMOGRAPHICS Given Name: Riley Family Name: Moore Date of Birth: 03/22/1997 Email: riley.moore97@example.com Phone Number: (214) 555-0182 Address: 1842 Westfield Ave, Dallas, TX 75214 Race: White`;
    const r = parseGeneralIntakeDocument(text);
    expect(r.patientFields.givenName).toBe('Riley');
    expect(r.patientFields.familyName).toBe('Moore');
    expect(r.patientFields.dateOfBirth).toBe('1997-03-22');
    expect(r.patientFields.email).toContain('riley.moore97');
    expect(r.patientFields.address).toContain('Dallas');
  });

  it('rejects clinical sentences as names', () => {
    const text = `Name Mild intermittent asthma. Seasonal allergies. DOB 03/05/2018`;
    const r = parseGeneralIntakeDocument(text);
    expect(r.patientFields.givenName).toBeUndefined();
    expect(r.patientFields.dateOfBirth).toBe('2018-03-05');
  });

  it('does not use encounter note dates as DOB', () => {
    const text = `PATIENT DEMOGRAPHICS Child Name Lucas Martinez DOB 03/05/2018 Sex Male PROBLEMS asthma ENCOUNTER NOTE 1 Date: 2026-02-04 Facility: North Valley Clinic`;
    const r = parseGeneralIntakeDocument(text);
    expect(r.patientFields.dateOfBirth).toBe('2018-03-05');
    expect(r.hospitalVisit.visitDate).toBe('2026-02-04');
  });
});

describe('parseTab14IntakeDocument uses general engine', () => {
  it('routes Riverbend PDF text through general + specialized merge', () => {
    const text = `Synthetic dummy record PATIENT DEMOGRAPHICS Name Amina Hassan DOB 01/29/1961 Sex Female Preferred Language Arabic DIAGNOSIS Invasive ductal carcinoma of left breast.`;
    const r = parseTab14IntakeDocument(text);
    expect(r.patientFields.givenName).toBe('Amina');
    expect(r.patientFields.familyName).toBe('Hassan');
    expect(r.patientFields.preferredLanguage).toBe('Arabic');
  });
});
