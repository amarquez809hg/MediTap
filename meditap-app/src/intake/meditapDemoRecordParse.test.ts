import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  isDataPortabilityCompactRecord,
  isMeditapDemoRecordDocument,
  parseMeditapDemoRecordDocument,
  preprocessCompactPortabilityText,
  preprocessGluedLabelText,
} from './meditapDemoRecordParse';
import { parseTab14IntakeDocument } from './tab14DocumentParse';

const jordanParkerFixture = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../test-fixtures/jordan-parker-extract.txt'),
  'utf8'
).trim();

const jordanParkerBrowserFixture = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), '../../test-fixtures/jordan-parker-browser-extract.txt'),
  'utf8'
).trim();

const fixturePath = join(
  dirname(fileURLToPath(import.meta.url)),
  '../../tmp-meditap3-extract.txt'
);

describe('parseMeditapDemoRecordDocument', () => {
  it('parses all four chronic conditions from Meditap-3 extract', () => {
    const raw = readFileSync(fixturePath, 'utf8');
    const r = parseMeditapDemoRecordDocument(raw);
    expect(r.chronicConditions).toHaveLength(4);
    expect(r.medications.length).toBeGreaterThanOrEqual(4);
    expect(r.patientFields.bloodType).toBe('O+');
  });

  it('does not split Blood Type label during preprocess', () => {
    const t = preprocessGluedLabelText('Sex at Birth: Male Blood Type: O+ Email: a@b.com');
    expect(t).toContain('Blood Type: O+');
    expect(t).not.toMatch(/Blood\nType:/);
  });

  it('detects Jordan Parker Data Portability compact demo record', () => {
    expect(isDataPortabilityCompactRecord(jordanParkerFixture)).toBe(true);
    expect(isMeditapDemoRecordDocument(jordanParkerFixture)).toBe(true);
  });

  it('parses Jordan Parker Data Portability demo record', () => {
    const r = parseMeditapDemoRecordDocument(jordanParkerFixture);
    expect(r.patientFields.givenName).toBe('Jordan');
    expect(r.patientFields.familyName).toBe('Parker');
    expect(r.patientFields.dateOfBirth).toBe('1992-08-17');
    expect(r.patientFields.sexAtBirth).toBe('Female');
    expect(r.patientFields.bloodType).toBe('A+');
    expect(r.patientFields.email).toBe('jordan.parker92@example.com');
    expect(r.patientFields.phoneNumber).toBe('(512) 555-0148');
    expect(r.patientFields.address).toContain('Austin');
    expect(r.patientFields.maritalStatus).toBe('Married');
    expect(r.patientFields.weightLbs).toBe('154');
    expect(r.patientFields.systolicBp).toBe('122');
    expect(r.patientFields.diastolicBp).toBe('78');
    expect(r.patientFields.heartRate).toBe('68');
    expect(Number(r.patientFields.heightInches)).toBeGreaterThan(60);

    expect(r.allergies).toHaveLength(2);
    expect(r.allergies.some((a) => /sulfa/i.test(a.allergyName))).toBe(true);
    expect(r.allergies.some((a) => /shellfish/i.test(a.allergyName))).toBe(true);

    expect(r.chronicConditions).toHaveLength(2);
    expect(r.chronicConditions.some((c) => /hypertension/i.test(c.conditionName))).toBe(true);
    expect(r.chronicConditions.some((c) => c.icdCode === 'E78.5')).toBe(true);

    expect(r.medications.length).toBeGreaterThanOrEqual(3);
    expect(r.medications.some((m) => /losartan/i.test(m.genericName))).toBe(true);
    expect(r.medications.some((m) => /vitamin d3/i.test(m.genericName))).toBe(true);

    expect(r.insurances[0]?.providerName).toMatch(/aetna/i);
    expect(r.insurances[0]?.policyNumber).toBe('ATX94827511');

    expect(r.hospitalVisit.facilityName).toMatch(/St\. David/i);
    expect(r.hospitalVisit.visitType).toMatch(/Emergency/i);
    expect(r.hospitalVisit.visitDate).toBe('2026-02-18');
    expect(r.hospitalVisit.reason).toMatch(/chest pain/i);
  });

  it('routes Jordan Parker text through parseTab14IntakeDocument', () => {
    const r = parseTab14IntakeDocument(jordanParkerFixture);
    expect(r.patientFields.givenName).toBe('Jordan');
    expect(r.medications.length).toBeGreaterThanOrEqual(3);
    expect(r.allergies.length).toBe(2);
    expect(r.chronicConditions).toHaveLength(2);
    expect(r.chronicConditions.every((c) => !/group\s*#/i.test(c.conditionName))).toBe(true);
    expect(r.patientFields.systolicBp).toBe('122');
    expect(r.patientFields.heartRate).toBe('68');
  });

  it('detects Jordan Parker from browser-style pdf.js extraction', () => {
    expect(isDataPortabilityCompactRecord(jordanParkerBrowserFixture)).toBe(true);
    expect(isMeditapDemoRecordDocument(jordanParkerBrowserFixture)).toBe(true);
  });

  it('parses allergies, medications, and vitals from browser-style pdf.js extraction', () => {
    const r = parseMeditapDemoRecordDocument(jordanParkerBrowserFixture);
    const full = parseTab14IntakeDocument(jordanParkerBrowserFixture);

    expect(r.patientFields.givenName).toBe('Jordan');
    expect(r.allergies).toHaveLength(2);
    expect(r.medications.length).toBeGreaterThanOrEqual(3);
    expect(r.chronicConditions).toHaveLength(2);
    expect(r.patientFields.systolicBp).toBe('122');
    expect(r.patientFields.heartRate).toBe('68');

    expect(full.allergies).toHaveLength(2);
    expect(full.medications.length).toBeGreaterThanOrEqual(3);
  });

  it('preprocess splits glued compact section headers', () => {
    const t = preprocessCompactPortabilityText('DemographicsSex: Female AllergiesSulfa');
    expect(t).toContain('Demographics Sex');
    expect(t).toContain('Allergies Sulfa');
  });

  it('parses glued chronic header text from PDF extraction', () => {
    const glued = jordanParkerFixture.replace(
      'Chronic Conditions  Essential',
      'Chronic ConditionsEssential'
    );
    const r = parseMeditapDemoRecordDocument(glued);
    expect(r.chronicConditions).toHaveLength(2);
    expect(r.chronicConditions[0].conditionName).toMatch(/hypertension/i);
    expect(r.chronicConditions[0].icdCode).toBe('I10');
  });
});
