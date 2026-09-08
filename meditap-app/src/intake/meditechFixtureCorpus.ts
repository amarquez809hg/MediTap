/**
 * MEDITECH CCD / MyHealth fixture corpus — training registry for non-Athena portability PDFs.
 * Same completeness scorer as Athena (left-menu sections); detector stays Meditech-specific.
 */

export type MeditechFixtureExpectation = {
  /** Relative to meditap-app/ */
  pdfPath: string;
  id: string;
  patient: { givenName: string; familyName: string };
  minScorePercent: number;
  mustBeFilled: string[];
  knownGaps?: string[];
};

export const MEDITECH_CCD_FIXTURE_CORPUS: MeditechFixtureExpectation[] = [
  {
    id: 'jordan-rivera-meditech',
    pdfPath: 'test-fixtures/dummyPDFs/meditech_sample_ehr_record.pdf',
    patient: { givenName: 'Jordan A', familyName: 'Rivera' },
    minScorePercent: 95,
    mustBeFilled: [
      'demographics',
      'relatedPerson',
      'careTeamMembers',
      'careTeam',
      'planOfTreatment',
      'results',
      'allergies',
      'medications',
      'vitals',
      'socialHistory',
      'functionalStatus',
      'mentalStatus',
      'familyHistory',
      'medicalHistory',
      'immunizations',
      'pastEncounters',
      'payers',
      'notes',
      'imagingResults',
    ],
    // Explicit none in this sample CCD (still scored as none_recorded, not gaps).
    knownGaps: [],
  },
];
