import { describe, expect, it } from 'vitest';
import {
  cleanConditionDisplayName,
  cleanFacilityDisplayName,
  cleanDemographicFieldValue,
} from './intakeNameCleanup';

describe('cleanConditionDisplayName', () => {
  it('strips allergy + Chronic Conditions bleed and extracts diagnosis date', () => {
    const r = cleanConditionDisplayName(
      'Shellfish – Swelling Chronic ConditionsEssential Hypertension () – Diagnosed 05/14/2022'
    );
    expect(r.name).toBe('Essential Hypertension');
    expect(r.diagnosisDate).toBe('2022-05-14');
    expect(r.icdCode).toBe('');
  });

  it('cuts trailing Medications bleed and keeps ICD when present', () => {
    const r = cleanConditionDisplayName(
      'Hyperlipidemia () – Diagnosed 11/08/2023 MedicationsLosartan 50 mg PO daily – Hypertension – Dr. Olivia Bennett'
    );
    expect(r.name).toBe('Hyperlipidemia');
    expect(r.diagnosisDate).toBe('2023-11-08');
  });

  it('strips ICD-10 Active date tail from procedure-style problems', () => {
    const r = cleanConditionDisplayName(
      'Status post Percutaneous Coronary Intervention with drug-eluting stent ICD-10 Active 01/09/2026'
    );
    expect(r.name).toBe(
      'Status post Percutaneous Coronary Intervention with drug-eluting stent'
    );
    expect(r.diagnosisDate).toBe('2026-01-09');
  });

  it('leaves clean names alone', () => {
    const r = cleanConditionDisplayName('Essential Hypertension');
    expect(r.name).toBe('Essential Hypertension');
    expect(r.diagnosisDate).toBe('');
  });
});

describe('cleanFacilityDisplayName', () => {
  it('strips time zone, visit type, and address from Cayuga-style bleed', () => {
    const r = cleanFacilityDisplayName(
      'PM EDT Emergency Cayuga Medical Center Emergency Department 101 Dates Drive Ithaca, NY 14850'
    );
    expect(r.name).toBe('Cayuga Medical Center Emergency Department');
    expect(r.city).toBe('Ithaca');
    expect(r.region).toBe('NY');
    expect(r.postalCode).toBe('14850');
    expect(r.addressLine1.toLowerCase()).toContain('dates');
  });

  it('leaves clean hospital names alone', () => {
    const r = cleanFacilityDisplayName('Mayo Clinic');
    expect(r.name).toBe('Mayo Clinic');
    expect(r.city).toBe('');
  });
});

describe('cleanDemographicFieldValue', () => {
  it('strips Demographics Related Person from family name', () => {
    const r = cleanDemographicFieldValue(
      'familyName',
      'JenningsDemographics Related Person'
    );
    expect(r.value).toBe('Jennings');
    expect(r.changed).toBe(true);
  });

  it('extracts phone from Number/mailto/Address mash', () => {
    const r = cleanDemographicFieldValue(
      'phoneNumber',
      'Number: tel:+1-(555) 020-0002 mailto:linda.jennings.record@example.com Address: 452 OAK RIDGE LANE, DENVER, CO 80203-0000'
    );
    expect(r.value).toBe('(555) 020-0002');
  });

  it('cuts race at Preferred / Marital bleed', () => {
    const r = cleanDemographicFieldValue(
      'race',
      'Black or African American Preferred English Marital status: Married'
    );
    expect(r.value).toBe('Black or African American');
  });

  it('cuts ethnicity at DOB / Race bleed', () => {
    const r = cleanDemographicFieldValue(
      'ethnicity',
      'Not Hispanic or Latino DOB: 05/14/1968 Race: Black or African American Preferred English'
    );
    expect(r.value).toBe('Not Hispanic or Latino');
  });

  it('cleans preferred language contact bleed', () => {
    const r = cleanDemographicFieldValue(
      'preferredLanguage',
      'Previous Name: Contact: 452 OAK RIDGE LANE, DENVER, CO 80203-0000, USA, Ph. tel:+1-(555) 020-0000'
    );
    expect(r.value).not.toMatch(/Contact|tel:|OAK RIDGE/i);
  });
});
