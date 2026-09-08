/**
 * Epic My Health Summary fixture corpus — Mayo `- as of` dialect (Jane Doe) +
 * Centralus Summary of Care (Joanna Smith) when present.
 */

export type EpicFixtureExpectation = {
  /** Relative to meditap-app/ — PDF or .snapshot.txt */
  sourcePath: string;
  id: string;
  /** When true, source is plain text (not PDF). */
  textFixture?: boolean;
  patient?: { givenName?: string; familyName?: string };
  /** Sex / clinical fingerprint when demographics cover is image-only. */
  requireSexAtBirth?: string;
  minScorePercent: number;
  mustBeFilled: string[];
  knownGaps?: string[];
};

export const EPIC_HEALTH_SUMMARY_FIXTURE_CORPUS: EpicFixtureExpectation[] = [
  {
    id: 'jane-doe-mayo-my-health-summary',
    sourcePath: 'test-fixtures/dummyPDFs/epic_jane_doe_my_health_summary.snapshot.txt',
    textFixture: true,
    // Cover/demographics are OCR'd from image page 1 on the real PDF.
    patient: { givenName: 'Jane A', familyName: 'Smith-Doe' },
    requireSexAtBirth: 'Female',
    minScorePercent: 90,
    mustBeFilled: [
      'demographics',
      'allergies',
      'medications',
      'problems',
      'vitals',
      'immunizations',
      'socialHistory',
      'procedures',
      'results',
      'pastEncounters',
      'careTeam',
      'planOfTreatment',
    ],
    knownGaps: [
      'Payers',
    ],
  },
];
