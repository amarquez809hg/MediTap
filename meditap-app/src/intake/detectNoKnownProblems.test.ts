import { describe, expect, it } from 'vitest';
import {
  detectNoKnownProblems,
  NO_KNOWN_PROBLEMS_LABEL,
  noKnownProblemsChronicRow,
} from './detectNoKnownProblems';
import { applyTab14ParseBundle, emptyMergeSnapshot } from './applyTab14ParseBundle';
import type { Tab14IntakeParseResult } from './tab14IntakeTypes';

describe('detectNoKnownProblems', () => {
  it('matches Athena wrapped Problems section', () => {
    const text = `
Results Imaging
Problems No Known
Problems
Procedures Surgical History Date Name
`;
    expect(detectNoKnownProblems(text)).toBe(true);
  });

  it('ignores PHQ and family-history problem wording', () => {
    expect(
      detectNoKnownProblems(
        'how difficult have these problems made it for you to do your work'
      )
    ).toBe(false);
    expect(
      detectNoKnownProblems('Family History Problems (Glaucoma, Retinopathy) N')
    ).toBe(false);
  });
});

describe('apply noKnownProblems', () => {
  it('checks none-known and fills Condition Name / Notes', () => {
    const bundle: Tab14IntakeParseResult = {
      patientFields: { givenName: 'Diana', familyName: 'Smith' },
      noKnownDrugAllergies: false,
      noKnownProblems: true,
      insurances: [],
      allergies: [],
      medications: [],
      chronicConditions: [noKnownProblemsChronicRow()],
      hospitalVisit: {},
      labPanels: [],
    };
    const { snapshot } = applyTab14ParseBundle(emptyMergeSnapshot(), bundle);
    expect(snapshot.noChronicConditions).toBe(true);
    expect(snapshot.chronicConditions).toHaveLength(1);
    expect(snapshot.chronicConditions[0].conditionName).toBe(NO_KNOWN_PROBLEMS_LABEL);
    expect(snapshot.chronicConditions[0].notesChronicConditions).toBe(
      NO_KNOWN_PROBLEMS_LABEL
    );
  });
});
