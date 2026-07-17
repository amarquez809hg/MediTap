import { describe, expect, it } from 'vitest';
import {
  bundleHasPatientIdentity,
  clearPatientFieldWarning,
  emptyMergeSnapshot,
  applyTab14ParseBundle,
  mergePdfPatientFieldWarnings,
  mergePdfPatientFields,
} from './applyTab14ParseBundle';
import type { Tab14IntakeParseResult } from './tab14IntakeTypes';
import { FIELD_WARNING_MESSAGES } from './intakeFieldWarnings';

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

describe('PDF field warning merge', () => {
  it('preserves warnings for the winning patient field values across uploads', () => {
    const first: Tab14IntakeParseResult = {
      patientFields: { givenName: 'Maria', familyName: 'Garcia' },
      noKnownDrugAllergies: false,
      insurances: [],
      allergies: [],
      medications: [],
      chronicConditions: [],
      hospitalVisit: {},
      fieldWarnings: {
        givenName: {
          message: FIELD_WARNING_MESSAGES.VERIFY_LABEL_BLEED,
          reason: 'label_bleed',
        },
      },
    };
    const second: Tab14IntakeParseResult = {
      patientFields: { givenName: 'Maria', email: 'maria@example.com' },
      noKnownDrugAllergies: false,
      insurances: [],
      allergies: [],
      medications: [],
      chronicConditions: [],
      hospitalVisit: {},
      fieldWarnings: {
        email: {
          message: FIELD_WARNING_MESSAGES.VERIFY_OCR,
          reason: 'ocr_sparse',
        },
      },
    };

    let fields = mergePdfPatientFields({}, first.patientFields);
    let warnings = mergePdfPatientFieldWarnings(undefined, {}, first);
    fields = mergePdfPatientFields(fields, second.patientFields);
    warnings = mergePdfPatientFieldWarnings(warnings, first.patientFields, second);

    expect(fields.givenName).toBe('Maria');
    expect(fields.familyName).toBe('Garcia');
    expect(fields.email).toBe('maria@example.com');
    expect(warnings?.givenName?.reason).toBe('label_bleed');
    expect(warnings?.email?.reason).toBe('ocr_sparse');
  });

  it('clears a single field warning after manual edit', () => {
    const cleared = clearPatientFieldWarning(
      {
        givenName: {
          message: FIELD_WARNING_MESSAGES.VERIFY_LABEL_BLEED,
          reason: 'label_bleed',
        },
        familyName: {
          message: FIELD_WARNING_MESSAGES.VERIFY_LABEL_BLEED,
          reason: 'label_bleed',
        },
      },
      'givenName'
    );
    expect(cleared?.givenName).toBeUndefined();
    expect(cleared?.familyName?.reason).toBe('label_bleed');
  });

  it('does not carry a warning to a different value supplied by a later upload', () => {
    const first: Tab14IntakeParseResult = {
      patientFields: { givenName: 'Maria Garcia DOB 01/02/1990' },
      noKnownDrugAllergies: false,
      insurances: [],
      allergies: [],
      medications: [],
      chronicConditions: [],
      hospitalVisit: {},
      fieldWarnings: {
        givenName: {
          message: FIELD_WARNING_MESSAGES.VERIFY_OTHER_LABEL,
          reason: 'contains_other_label',
        },
      },
    };
    const second: Tab14IntakeParseResult = {
      patientFields: { givenName: 'Maria' },
      noKnownDrugAllergies: false,
      insurances: [],
      allergies: [],
      medications: [],
      chronicConditions: [],
      hospitalVisit: {},
    };

    const firstFields = mergePdfPatientFields({}, first.patientFields);
    const firstWarnings = mergePdfPatientFieldWarnings(undefined, {}, first);
    const warnings = mergePdfPatientFieldWarnings(firstWarnings, firstFields, second);

    expect(warnings?.givenName).toBeUndefined();
  });
});
