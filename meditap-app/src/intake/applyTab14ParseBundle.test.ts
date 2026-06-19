import { describe, expect, it } from 'vitest';
import {
  bundleHasPatientIdentity,
  emptyMergeSnapshot,
  applyTab14ParseBundle,
} from './applyTab14ParseBundle';
import type { Tab14IntakeParseResult } from './tab14IntakeTypes';

describe('bundleHasPatientIdentity', () => {
  it('detects given + family name', () => {
    const bundle: Tab14IntakeParseResult = {
      patientFields: { givenName: 'Rafael', familyName: 'Santos' },
      noKnownDrugAllergies: false,
      insurances: [],
      allergies: [],
      medications: [],
      chronicConditions: [],
      hospitalVisit: {},
    };
    expect(bundleHasPatientIdentity(bundle)).toBe(true);
  });
});

describe('replace chart from PDF upload', () => {
  it('does not keep stale allergies when starting from empty snapshot', () => {
    const stale = {
      ...emptyMergeSnapshot(),
      allergies: [
        {
          allergyName: 'Penicillin',
          allergyType: 'Drug',
          allergyTypeOther: '',
          severity: 'Moderate',
          reactionNotes: 'Rash',
          lastObserved: '',
        },
      ],
    };
    const pdfBundle: Tab14IntakeParseResult = {
      patientFields: { givenName: 'Rafael', familyName: 'Santos' },
      noKnownDrugAllergies: false,
      insurances: [],
      allergies: [
        {
          allergyName: 'Pollen',
          allergyType: 'Environmental',
          allergyTypeOther: '',
          severity: 'Mild',
          reactionNotes: '',
          lastObserved: '',
        },
      ],
      medications: [],
      chronicConditions: [],
      hospitalVisit: {},
    };
    const merged = applyTab14ParseBundle(emptyMergeSnapshot(), pdfBundle);
    expect(merged.snapshot.allergies).toHaveLength(1);
    expect(merged.snapshot.allergies[0].allergyName).toBe('Pollen');
    expect(stale.allergies[0].allergyName).toBe('Penicillin');
  });
});
