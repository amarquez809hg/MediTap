/**
 * Athena Data Portability fixture corpus — the training registry.
 * Each entry is a real PDF we lock with minimum section expectations.
 * When a new patient PDF fails intake, add it here (do not one-off patch forever).
 */

export type AthenaFixtureExpectation = {
  /** Relative to meditap-app/ */
  pdfPath: string;
  id: string;
  patient: { givenName: string; familyName: string };
  /** Minimum Athena section completeness percent after parse. */
  minScorePercent: number;
  /** Section ids that must not be missing/thin (from athenaPortabilityCompleteness). */
  mustBeFilled: string[];
  /** Optional known gaps we still track but allow for now (training backlog). */
  knownGaps?: string[];
};

/**
 * Locked Athena portability fixtures. Add Harold/Diana siblings here as clinics expand.
 */
export const ATHENA_PORTABILITY_FIXTURE_CORPUS: AthenaFixtureExpectation[] = [
  {
    id: 'diana-smith',
    pdfPath: 'test-fixtures/dummyPDFs/diana_smith_medical_record.pdf',
    patient: { givenName: 'Diana', familyName: 'Smith' },
    // Diana is the high bar — keep raising mustBeFilled, never lower.
    minScorePercent: 95,
    mustBeFilled: [
      'demographics',
      'allergies',
      'medications',
      'payers',
      'results',
      'vitals',
      'careTeamMembers',
      'careTeam',
      'planOfTreatment',
      'patientInstructions',
      'medicalHistory',
      'immunizations',
      'socialHistory',
      'mentalStatus',
      'pastEncounters',
      'notes',
    ],
  },
  {
    id: 'harold-jennings',
    pdfPath: 'test-fixtures/dummyPDFs/harold_jennings_medical_record.pdf',
    patient: { givenName: 'Harold', familyName: 'Jennings' },
    minScorePercent: 90,
    mustBeFilled: [
      'demographics',
      'allergies',
      'medications',
      'problems',
      'payers',
      'results',
      'vitals',
      'careTeamMembers',
      'careTeam',
      'planOfTreatment',
      'patientInstructions',
      'medicalHistory',
      'immunizations',
      'socialHistory',
      'notes',
    ],
    // Training backlog — remove when Past Encounters dialect is parsed.
    knownGaps: ['pastEncounters'],
  },
];
