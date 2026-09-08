import { describe, expect, it } from 'vitest';
import {
  acceptAllPatientFieldWarnings,
  acceptIndexedFieldWarning,
  acceptPatientFieldWarning,
  evaluatePatientFieldReviewGate,
  matchParsedIdentityToChart,
  rejectIndexedFieldWarning,
  rejectPatientFieldWarning,
} from './intakeFieldReview';
import type { Tab14AllergyRowWarnings, Tab14PatientFieldWarnings } from './tab14IntakeTypes';

const warnings: Tab14PatientFieldWarnings = {
  givenName: { message: 'verify', reason: 'ocr_sparse' },
  familyName: { message: 'verify', reason: 'ocr_sparse' },
  email: { message: 'verify', reason: 'other' },
};

const allergyWarnings: Tab14AllergyRowWarnings = {
  0: {
    allergyName: {
      message: 'unknown',
      reason: 'terminology',
      sourceLabel: 'Allergy from document',
      sourcePage: 2,
    },
  },
};

describe('intakeFieldReview', () => {
  it('blocks save while warnings are unresolved', () => {
    const gate = evaluatePatientFieldReviewGate(warnings, {});
    expect(gate.canSave).toBe(false);
    expect(gate.unresolvedCount).toBe(3);
  });

  it('counts clinical-row warnings in the gate', () => {
    const gate = evaluatePatientFieldReviewGate(undefined, {}, {
      allergies: allergyWarnings,
      decisions: {},
    });
    expect(gate.unresolvedIndexedCount).toBe(1);
    expect(gate.canSave).toBe(false);
  });

  it('accept clears warning and allows that field', () => {
    const { warnings: next, decisions } = acceptPatientFieldWarning(
      warnings,
      {},
      'givenName'
    );
    expect(next?.givenName).toBeUndefined();
    expect(decisions.givenName).toBe('accepted');
    expect(evaluatePatientFieldReviewGate(next, decisions).unresolvedCount).toBe(
      2
    );
  });

  it('accept/reject indexed clinical warnings', () => {
    const accepted = acceptIndexedFieldWarning(
      allergyWarnings,
      {},
      0,
      'allergyName'
    );
    expect(accepted.warnings).toBeUndefined();
    expect(
      evaluatePatientFieldReviewGate(undefined, {}, {
        allergies: accepted.warnings,
        decisions: accepted.decisions,
      }).canSave
    ).toBe(true);

    const rejected = rejectIndexedFieldWarning(allergyWarnings, {}, 0, 'allergyName');
    expect(rejected.clearField).toBe(true);
    expect(rejected.warnings).toBeUndefined();
  });

  it('reject marks decision and clears warning', () => {
    const result = rejectPatientFieldWarning(warnings, {}, 'email');
    expect(result.clearField).toBe(true);
    expect(result.warnings?.email).toBeUndefined();
    expect(result.decisions.email).toBe('rejected');
  });

  it('accept-all clears demographic + clinical gates', () => {
    const { warnings: next, decisions, indexedDecisions, allergies } =
      acceptAllPatientFieldWarnings(warnings, {}, {
        allergies: allergyWarnings,
        decisions: {},
      });
    expect(next).toBeUndefined();
    expect(allergies).toBeUndefined();
    expect(
      evaluatePatientFieldReviewGate(next, decisions, {
        allergies,
        decisions: indexedDecisions,
      }).canSave
    ).toBe(true);
  });

  it('matches parsed identity to chart', () => {
    expect(
      matchParsedIdentityToChart({
        parsedGiven: 'Antonio',
        parsedFamily: 'Márquez',
        chartGiven: 'Antonio',
        chartFamily: 'Marquez',
      }).match
    ).toBe(true);

    expect(
      matchParsedIdentityToChart({
        parsedGiven: 'Jordan',
        parsedFamily: 'Parker',
        chartGiven: 'Antonio',
        chartFamily: 'Marquez',
      }).reason
    ).toBe('mismatch');
  });
});
