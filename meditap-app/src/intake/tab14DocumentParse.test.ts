import { describe, expect, it } from 'vitest';
import { parseTab14IntakeDocument, tryParseDateToIso } from './tab14DocumentParse';

describe('tryParseDateToIso', () => {
  it('parses ISO and US slash dates', () => {
    expect(tryParseDateToIso('1990-03-15')).toBe('1990-03-15');
    expect(tryParseDateToIso('3/15/1990')).toBe('1990-03-15');
  });
});

describe('parseTab14IntakeDocument', () => {
  it('fills patient, insurance, allergies, meds, chronic, hospital from summary text', () => {
    const text = `
Patient Information
Patient Name: Jane Doe
Date of Birth: 1985-07-22
Email: jane.doe@example.com
Phone: (415) 555-0199
Blood Type: A+
Sex at Birth: Female

Insurance
Payer Name: Aetna
Member ID: XYZ123456789
Group Number: GRP-88
Policy Number: POL-001
Plan Name: Open Access

Allergies
- Penicillin — hives
- Peanuts

Medications
- Metformin 500 mg PO twice daily
- Lisinopril 10 mg daily

Chronic Conditions
E11.9 Type 2 diabetes mellitus without complications

Hospital
Facility: General Hospital
Admission Date: 01/10/2024
Discharge Date: 01/12/2024
Attending: Dr. Smith
Reason: observation
`;
    const r = parseTab14IntakeDocument(text);
    expect(r.patientFields.givenName).toBe('Jane');
    expect(r.patientFields.familyName).toBe('Doe');
    expect(r.patientFields.dateOfBirth).toBe('1985-07-22');
    expect(r.patientFields.email).toContain('jane.doe');
    expect(r.patientFields.bloodType).toBe('A+');
    expect(r.patientFields.sexAtBirth).toBe('Female');

    expect(r.insurances.length).toBeGreaterThan(0);
    expect(r.insurances[0].providerName.toLowerCase()).toContain('aetna');

    expect(r.allergies.length).toBeGreaterThanOrEqual(2);
    expect(r.medications.length).toBeGreaterThanOrEqual(1);
    expect(r.medications[0].genericName.toLowerCase()).toContain('metformin');

    expect(r.chronicConditions.some((c) => c.icdCode.startsWith('E11'))).toBe(true);

    expect(r.hospitalVisit.facilityName).toContain('General Hospital');
    expect(r.hospitalVisit.visitDate).toBe('2024-01-10');
  });

  it('detects NKDA', () => {
    const r = parseTab14IntakeDocument('Allergies: NKDA. Medications: aspirin 81 mg daily.');
    expect(r.noKnownDrugAllergies).toBe(true);
    expect(r.allergies.length).toBe(0);
  });
});
