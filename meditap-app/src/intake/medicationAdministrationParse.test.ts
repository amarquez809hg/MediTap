import { describe, expect, it } from 'vitest';
import { parseMedicationAdministrationRecord } from './medicationAdministrationParse';

const MAR_SNIPPET = `MEDICATION ADMINISTRATION RECORD Medication Dose Schedule Indication Medication 1 20 mg Nightly Diabetes Medication 2 5 mg TID Supplement Medication 9 1 tab BID GERD Medication 25 100 mg PRN Mood HIGH RISK MEDICATION FLAGS`;

describe('parseMedicationAdministrationRecord', () => {
  it('parses numbered medication rows from a MAR table', () => {
    const rows = parseMedicationAdministrationRecord(MAR_SNIPPET);
    expect(rows.length).toBe(4);
    expect(rows[0]).toMatchObject({
      genericName: 'Medication 1',
      dosage: '20 mg',
      frequency: 'Nightly',
      purpose: 'Diabetes',
    });
    expect(rows.find((r) => r.genericName === 'Medication 9')).toMatchObject({
      dosage: '1 tab',
      frequency: 'BID',
      purpose: 'GERD',
    });
    expect(rows.find((r) => r.genericName === 'Medication 25')).toMatchObject({
      dosage: '100 mg',
      frequency: 'PRN',
      purpose: 'Mood',
    });
  });

  it('parses real drug names in the same MAR layout', () => {
    const text = `MEDICATION ADMINISTRATION RECORD Medication Dose Schedule Indication Metformin 500 mg Daily Diabetes Lisinopril 10 mg BID HTN HIGH RISK MEDICATION FLAGS`;
    const rows = parseMedicationAdministrationRecord(text);
    expect(rows.length).toBe(2);
    expect(rows[0].genericName).toBe('Metformin');
    expect(rows[1].genericName).toBe('Lisinopril');
  });
});
