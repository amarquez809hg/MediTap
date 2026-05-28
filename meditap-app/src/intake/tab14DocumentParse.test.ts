import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseTab14IntakeDocument, tryParseDateToIso } from './tab14DocumentParse';

const MEDITAP3_FIXTURE = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../tmp-meditap3-extract.txt'
);

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

  it('parses separate first and last name labels on one line each', () => {
    const r = parseTab14IntakeDocument(`
First Name: Antonio
Last Name: Marquez
Email: antonio.marquez809@gmail.com
Phone: (787) 555-0100
`);
    expect(r.patientFields.givenName).toBe('Antonio');
    expect(r.patientFields.familyName).toBe('Marquez');
    expect(r.patientFields.email).toContain('antonio.marquez809');
  });

  it('parses glued OCR-style labels and multi-word family names', () => {
    const r = parseTab14IntakeDocument(`
PatientName: Maria Elena Rodriguez
Date of Birth: 1970-01-01
Blood Type: O+
`);
    expect(r.patientFields.givenName).toBe('Maria Elena');
    expect(r.patientFields.familyName).toBe('Rodriguez');
    expect(r.patientFields.dateOfBirth).toBe('1970-01-01');
    expect(r.patientFields.bloodType).toBe('O+');
  });

  it('parses Athena-style data portability PDF text (Riley Moore sample)', () => {
    const text = `Data Portability for Riley Moore Table of Contents Demographics
Allergies
Medications
Vitals
Notes Demographics Sex  Male  DOB  03/22/1997
Phone  (214) 555-0182  Email  riley.moore97@example.com
Primary Care Physician  Dr. Marcus Hale, MD  Lakeside Family Medicine
Problems Condition  Status Essential Hypertension  Active
GERD  Active
Allergies Allergen  Reaction Penicillin  Rash
Pollen Extracts  Congestion Medications Medication  Instructions Lisinopril 10 mg  Take 1 tablet daily
Omeprazole 20 mg  Take 1 capsule before breakfast
Cetirizine 10 mg  Take daily as needed
Sumatriptan 50 mg  Take at onset of migraine
Vitals Date  BP  HR  Weight  BMI
Past Encounters / Notes 01/12/2026 – Follow-up visit for hypertension management. 04/18/2026 – Patient reports improved migraine frequency.`;

    const r = parseTab14IntakeDocument(text);
    expect(r.patientFields.givenName).toBe('Riley');
    expect(r.patientFields.familyName).toBe('Moore');
    expect(r.patientFields.dateOfBirth).toBe('1997-03-22');
    expect(r.patientFields.email).toContain('riley.moore97');
    expect(r.patientFields.sexAtBirth).toBe('Male');

    expect(r.allergies.length).toBe(2);
    expect(r.allergies.some((a) => /penicillin/i.test(a.allergyName))).toBe(true);
    expect(r.allergies.some((a) => /pollen/i.test(a.allergyName))).toBe(true);

    expect(r.medications.length).toBe(4);
    expect(r.medications[0].genericName).toMatch(/lisinopril/i);
    expect(r.medications[0].dosage).toMatch(/10\s*mg/i);

    expect(r.chronicConditions.length).toBeGreaterThanOrEqual(2);
    expect(r.chronicConditions.some((c) => /hypertension/i.test(c.conditionName))).toBe(true);

    expect(r.hospitalVisit.attendingPhysician).toMatch(/Marcus Hale/i);
    expect(r.hospitalVisit.facilityName).toMatch(/Lakeside/i);
    expect(r.hospitalVisit.visitDate).toBe('2026-04-18');
  });

  it('parses MediTap demo labeled PDF text (Riley Moore Meditap-3 sample)', () => {
    const text = readFileSync(MEDITAP3_FIXTURE, 'utf8');
    const r = parseTab14IntakeDocument(text);
    expect(r.patientFields.givenName).toBe('Riley');
    expect(r.patientFields.familyName).toBe('Moore');
    expect(r.patientFields.dateOfBirth).toBe('1997-03-22');
    expect(r.patientFields.email).toContain('riley.moore97');
    expect(r.patientFields.bloodType).toBe('O+');
    expect(r.patientFields.sexAtBirth).toBe('Male');

    expect(r.allergies.length).toBe(2);
    expect(r.allergies[0].allergyName).toMatch(/penicillin/i);
    expect(r.allergies[0].severity).toMatch(/moderate/i);

    expect(r.insurances.length).toBeGreaterThanOrEqual(1);
    expect(r.insurances[0].providerName).toBe('Blue Cross Blue Shield of Texas');
    expect(r.insurances[0].policyNumber).toBe('TX-BCBS-44281795');
    expect(r.insurances[0].startDate).toBe('2025-01-01');
    expect(r.insurances[0].endDate).toBe('2026-12-31');

    expect(r.hospitalVisit.facilityName).toBe('Lakeside Family Medicine');
    expect(r.hospitalVisit.visitType).toMatch(/outpatient/i);
    expect(r.hospitalVisit.visitDate).toBe('2026-04-18');
    expect(r.hospitalVisit.attendingPhysician).toMatch(/Marcus Hale/i);
    expect(r.hospitalVisit.reportId).toBe('LH-2026-0418-RM');

    expect(r.medications.length).toBeGreaterThanOrEqual(1);
    expect(r.medications[0].genericName).toMatch(/lisinopril/i);

    expect(r.chronicConditions.length).toBeGreaterThanOrEqual(4);
    expect(r.chronicConditions[0].conditionName).toMatch(/essential hypertension/i);
    expect(r.chronicConditions[0].icdCode).toBe('I10');
    expect(r.chronicConditions[0].diagnosisDate).toBe('2025-01-12');
    expect(r.chronicConditions[0].prexisting).toBe('Yes');
  });
});
