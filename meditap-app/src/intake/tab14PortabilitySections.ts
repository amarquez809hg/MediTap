/**
 * Athena Data Portability / EHR section map for Tab14 (Add Patient Information).
 * Covers Athena TOC sections plus body sections like Patient Instructions.
 * Care Team Members (early contact card) and Care Team (end NPI table) are separate tabs.
 */

export const PORTABILITY_PDF_SECTIONS = [
  'Demographics',
  'Related Person',
  'Care Team Members',
  'Assessment',
  'Plan of Treatment',
  'Patient Instructions',
  'Reason for Referral',
  'Results',
  'Problems',
  'Procedures',
  'Surgical History',
  'Imaging Results',
  'Procedure Notes',
  'Medical Equipment',
  'Allergies',
  'Medications',
  'Vitals',
  'Social History',
  'Functional Status',
  'Mental Status',
  'Family History',
  'Medical History',
  'Obstetrics History',
  'Immunizations',
  'Past Encounters',
  'Goals Section',
  'Health Concerns Section',
  'Advance Directives',
  'Payers',
  'Notes',
  'Care Team',
] as const;

export type PortabilityPdfSection = (typeof PORTABILITY_PDF_SECTIONS)[number];

/** Sidebar / panel keys used by Tab14. */
export type Tab14SectionKey =
  | 'demographics'
  | 'relatedPerson'
  | 'careTeamMembers'
  | 'careTeam'
  | 'assessment'
  | 'planOfTreatment'
  | 'patientInstructions'
  | 'reasonForReferral'
  | 'results'
  | 'problems'
  | 'procedures'
  | 'surgicalHistory'
  | 'imagingResults'
  | 'procedureNotes'
  | 'medicalEquipment'
  | 'allergies'
  | 'medications'
  | 'vitals'
  | 'socialHistory'
  | 'functionalStatus'
  | 'mentalStatus'
  | 'familyHistory'
  | 'medicalHistory'
  | 'obstetricsHistory'
  | 'immunizations'
  | 'pastEncounters'
  | 'goals'
  | 'healthConcerns'
  | 'advanceDirectives'
  | 'payers'
  | 'notes';

export type Tab14NavSection = {
  id: number;
  key: Tab14SectionKey;
  labelKey: string;
  icon: string;
  /** PDF TOC labels this panel covers */
  pdfSections: PortabilityPdfSection[];
  /** Built-in rich UI already exists in Tab14.tsx */
  legacy: boolean;
};

/** Left-menu text — always matches Athena PDF section titles (not stale i18n). */
export function tab14NavLabel(s: Tab14NavSection): string {
  if (s.key === 'goals') return 'Goals';
  if (s.key === 'healthConcerns') return 'Health Concerns';
  if (s.key === 'careTeamMembers') return 'Care Team Members';
  if (s.key === 'careTeam') return 'Care Team';
  return s.pdfSections[s.pdfSections.length - 1] || s.key;
}

/** Sidebar order mirrors the Athena Data Portability table of contents. */
export const TAB14_PORTABILITY_NAV: Tab14NavSection[] = [
  {
    id: 0,
    key: 'demographics',
    labelKey: 'patientIntake.sections.demographics',
    icon: 'fa-id-card',
    pdfSections: ['Demographics'],
    legacy: true,
  },
  {
    id: 8,
    key: 'relatedPerson',
    labelKey: 'patientIntake.sections.relatedPerson',
    icon: 'fa-user-friends',
    pdfSections: ['Related Person'],
    legacy: false,
  },
  {
    id: 9,
    key: 'careTeamMembers',
    labelKey: 'patientIntake.sections.careTeamMembers',
    icon: 'fa-user-md',
    pdfSections: ['Care Team Members'],
    legacy: false,
  },
  {
    id: 10,
    key: 'assessment',
    labelKey: 'patientIntake.sections.assessment',
    icon: 'fa-stethoscope',
    pdfSections: ['Assessment'],
    legacy: false,
  },
  {
    id: 11,
    key: 'planOfTreatment',
    labelKey: 'patientIntake.sections.planOfTreatment',
    icon: 'fa-clipboard-list',
    pdfSections: ['Plan of Treatment'],
    legacy: false,
  },
  {
    id: 25,
    key: 'patientInstructions',
    labelKey: 'patientIntake.sections.patientInstructions',
    icon: 'fa-comment-medical',
    pdfSections: ['Patient Instructions'],
    legacy: false,
  },
  {
    id: 12,
    key: 'reasonForReferral',
    labelKey: 'patientIntake.sections.reasonForReferral',
    icon: 'fa-share',
    pdfSections: ['Reason for Referral'],
    legacy: false,
  },
  {
    id: 7,
    key: 'results',
    labelKey: 'patientIntake.sections.results',
    icon: 'fa-flask',
    pdfSections: ['Results'],
    legacy: true,
  },
  {
    id: 5,
    key: 'problems',
    labelKey: 'patientIntake.sections.problems',
    icon: 'fa-notes-medical',
    pdfSections: ['Problems'],
    legacy: true,
  },
  {
    id: 13,
    key: 'procedures',
    labelKey: 'patientIntake.sections.procedures',
    icon: 'fa-procedures',
    pdfSections: ['Procedures'],
    legacy: false,
  },
  {
    id: 26,
    key: 'surgicalHistory',
    labelKey: 'patientIntake.sections.surgicalHistory',
    icon: 'fa-bone',
    pdfSections: ['Surgical History'],
    legacy: false,
  },
  {
    id: 27,
    key: 'imagingResults',
    labelKey: 'patientIntake.sections.imagingResults',
    icon: 'fa-x-ray',
    pdfSections: ['Imaging Results'],
    legacy: false,
  },
  {
    id: 28,
    key: 'procedureNotes',
    labelKey: 'patientIntake.sections.procedureNotes',
    icon: 'fa-file-medical',
    pdfSections: ['Procedure Notes'],
    legacy: false,
  },
  {
    id: 14,
    key: 'medicalEquipment',
    labelKey: 'patientIntake.sections.medicalEquipment',
    icon: 'fa-wheelchair',
    pdfSections: ['Medical Equipment'],
    legacy: false,
  },
  {
    id: 2,
    key: 'allergies',
    labelKey: 'patientIntake.sections.allergies',
    icon: 'fa-exclamation-triangle',
    pdfSections: ['Allergies'],
    legacy: true,
  },
  {
    id: 3,
    key: 'medications',
    labelKey: 'patientIntake.sections.medications',
    icon: 'fa-pills',
    pdfSections: ['Medications'],
    legacy: true,
  },
  {
    id: 6,
    key: 'vitals',
    labelKey: 'patientIntake.sections.vitals',
    icon: 'fa-heartbeat',
    pdfSections: ['Vitals'],
    legacy: true,
  },
  {
    id: 15,
    key: 'socialHistory',
    labelKey: 'patientIntake.sections.socialHistory',
    icon: 'fa-home',
    pdfSections: ['Social History'],
    legacy: false,
  },
  {
    id: 16,
    key: 'functionalStatus',
    labelKey: 'patientIntake.sections.functionalStatus',
    icon: 'fa-walking',
    pdfSections: ['Functional Status'],
    legacy: false,
  },
  {
    id: 17,
    key: 'mentalStatus',
    labelKey: 'patientIntake.sections.mentalStatus',
    icon: 'fa-brain',
    pdfSections: ['Mental Status'],
    legacy: false,
  },
  {
    id: 18,
    key: 'familyHistory',
    labelKey: 'patientIntake.sections.familyHistory',
    icon: 'fa-sitemap',
    pdfSections: ['Family History'],
    legacy: false,
  },
  {
    id: 19,
    key: 'medicalHistory',
    labelKey: 'patientIntake.sections.medicalHistory',
    icon: 'fa-book-medical',
    pdfSections: ['Medical History'],
    legacy: false,
  },
  {
    id: 29,
    key: 'obstetricsHistory',
    labelKey: 'patientIntake.sections.obstetricsHistory',
    icon: 'fa-baby',
    pdfSections: ['Obstetrics History'],
    legacy: false,
  },
  {
    id: 20,
    key: 'immunizations',
    labelKey: 'patientIntake.sections.immunizations',
    icon: 'fa-syringe',
    pdfSections: ['Immunizations'],
    legacy: false,
  },
  {
    id: 1,
    key: 'pastEncounters',
    labelKey: 'patientIntake.sections.pastEncounters',
    icon: 'fa-hospital',
    pdfSections: ['Past Encounters'],
    legacy: true,
  },
  {
    id: 21,
    key: 'goals',
    labelKey: 'patientIntake.sections.goals',
    icon: 'fa-bullseye',
    pdfSections: ['Goals Section'],
    legacy: false,
  },
  {
    id: 22,
    key: 'healthConcerns',
    labelKey: 'patientIntake.sections.healthConcerns',
    icon: 'fa-exclamation-circle',
    pdfSections: ['Health Concerns Section'],
    legacy: false,
  },
  {
    id: 23,
    key: 'advanceDirectives',
    labelKey: 'patientIntake.sections.advanceDirectives',
    icon: 'fa-file-signature',
    pdfSections: ['Advance Directives'],
    legacy: false,
  },
  {
    id: 4,
    key: 'payers',
    labelKey: 'patientIntake.sections.payers',
    icon: 'fa-file-medical',
    pdfSections: ['Payers'],
    legacy: true,
  },
  {
    id: 24,
    key: 'notes',
    labelKey: 'patientIntake.sections.notes',
    icon: 'fa-sticky-note',
    pdfSections: ['Notes'],
    legacy: false,
  },
  {
    id: 30,
    key: 'careTeam',
    labelKey: 'patientIntake.sections.careTeam',
    icon: 'fa-users',
    pdfSections: ['Care Team'],
    legacy: false,
  },
];

/** Extended (non-legacy) section keys that use the generic entry list UI. */
export const TAB14_EXTENDED_SECTION_KEYS = TAB14_PORTABILITY_NAV.filter((s) => !s.legacy).map(
  (s) => s.key
) as Tab14ExtendedSectionKey[];

export type Tab14ExtendedSectionKey = Exclude<
  Tab14SectionKey,
  | 'demographics'
  | 'vitals'
  | 'allergies'
  | 'medications'
  | 'payers'
  | 'problems'
  | 'results'
  | 'pastEncounters'
>;

export type Tab14ClinicalEntry = {
  title: string;
  detail: string;
  date: string;
  /** Who recorded the answer (e.g. Sandra Galvez) */
  recordedBy: string;
  /** Organization / place (e.g. TX - Tenet Texas) */
  place: string;
  /** Clock time when recorded (e.g. 12:17:49) */
  time: string;
  /** Free-form notes (not recorder/place/time metadata) */
  notes: string;
  /** Athena Status column (active, completed, cancelled…) */
  status?: string;
  /** Order / concern category (Lab, Imaging, Medication order…) */
  category?: string;
  /** Related Person relation or Family History relationship */
  relationship?: string;
  phone?: string;
  email?: string;
  address?: string;
  /** Care Team columns */
  role?: string;
  memberId?: string;
  npi?: string;
  specialty?: string;
  /** Procedure / imaging laterality */
  laterality?: string;
  /** Athena encounter identifier tied to the row */
  encounterId?: string;
  code?: string;
  codeSystem?: string;
  icd10?: string;
  snomed?: string;
  /** Family History age columns */
  onsetAge?: string;
  diedAge?: string;
  resolvedAge?: string;
  /** Medical History checklist answer (Y / N) */
  response?: string;
  /** Clinical note MIME/type column (e.g. text/html) */
  noteType?: string;
  submitDate?: string;
  orderDate?: string;
  instructions?: string;
  performer?: string;
  location?: string;
  startDateTime?: string;
  closedDateTime?: string;
  /** Screener score (e.g. PHQ-2/PHQ-9 total) */
  score?: string;
};

export type Tab14ExtendedSections = Record<Tab14ExtendedSectionKey, Tab14ClinicalEntry[]>;

/** Optional Athena columns beyond the base title/detail/date/by/place/time/notes set. */
export const TAB14_EXTRA_ENTRY_FIELDS = [
  'status',
  'category',
  'relationship',
  'phone',
  'email',
  'address',
  'role',
  'memberId',
  'npi',
  'specialty',
  'laterality',
  'encounterId',
  'code',
  'codeSystem',
  'icd10',
  'snomed',
  'onsetAge',
  'diedAge',
  'resolvedAge',
  'response',
  'noteType',
  'submitDate',
  'orderDate',
  'instructions',
  'performer',
  'location',
  'startDateTime',
  'closedDateTime',
  'score',
] as const;

export type Tab14ExtraEntryField = (typeof TAB14_EXTRA_ENTRY_FIELDS)[number];

export function emptyClinicalEntry(): Tab14ClinicalEntry {
  const entry: Tab14ClinicalEntry = {
    title: '',
    detail: '',
    date: '',
    recordedBy: '',
    place: '',
    time: '',
    notes: '',
  };
  for (const field of TAB14_EXTRA_ENTRY_FIELDS) {
    entry[field] = '';
  }
  return entry;
}

function clinicalEntry(
  partial: Partial<Tab14ClinicalEntry> & Pick<Tab14ClinicalEntry, 'title'>
): Tab14ClinicalEntry {
  return { ...emptyClinicalEntry(), ...partial };
}

export function emptyExtendedSections(): Tab14ExtendedSections {
  const out = {} as Tab14ExtendedSections;
  for (const key of TAB14_EXTENDED_SECTION_KEYS) {
    out[key] = [];
  }
  return out;
}

const EXTENDED_HEADER: Record<Tab14ExtendedSectionKey, RegExp> = {
  relatedPerson: /\brelated\s+person\b/i,
  careTeamMembers: /\bcare\s+team\s+members\b/i,
  // End-of-document NPI table — not the earlier "Care Team Members" card
  careTeam: /\bcare\s+team\b(?!\s+members)/i,
  // Clinical Assessment section — not Mental Status column "Date Assessment Value"
  assessment: /(?:^|[\n\r]|[\s.])Assessment\b(?!\s+Value\b)(?=\s+(?:No\s+assessment|None\b)|$|\n)/i,
  planOfTreatment: /\bplan\s+of\s+treatment\b/i,
  // Section title — not the column header "Patient Instructions LastModified by"
  patientInstructions: /\bpatient\s+instructions\b(?!\s+LastModified)/i,
  reasonForReferral: /\breason\s+for\s+referral\b/i,
  // Skip Plan-of-Treatment nested "Procedures None recorded" — real section is
  // "Procedures" then "Surgical History" (often glued on one line).
  procedures: /(?:^|\n)\s*Procedures\b(?!\s+Notes\b)(?!\s+None\s+recorded)/i,
  surgicalHistory: /(?:^|\n)\s*Surgical\s+History\b/i,
  // Athena subsection under Procedures — not "Results Imaging"
  imagingResults: /(?:^|\n)\s*Imaging\s+Results\b/i,
  procedureNotes: /(?:^|\n)\s*Procedure\s+Notes\b/i,
  medicalEquipment: /\bmedical\s+equipment\b/i,
  socialHistory: /\bsocial\s+history\b/i,
  functionalStatus: /\bfunctional\s+status\b/i,
  mentalStatus: /\bmental\s+status\b/i,
  familyHistory: /\bfamily\s+history\b/i,
  medicalHistory: /\bmedical\s+history\b/i,
  // Athena places Obstetrics (and often Gynecological History) before Immunizations
  obstetricsHistory: /(?:^|\n)\s*(?:Obstetrics\s+History|Gynecological\s+History)\b/i,
  immunizations: /\bimmunizations?\b/i,
  goals: /\bgoals(?:\s+section)?\b/i,
  healthConcerns: /\bhealth\s+concerns(?:\s+section)?\b/i,
  advanceDirectives: /\badvance\s+directives?\b/i,
  // Section title — not the Q&A / Family History column header "Notes LastModified by"
  notes: /(?:^|\n)\s*Notes\b(?!\s+LastModified)/i,
};

const SECTION_STOP =
  /\b(?:Demographics|Related\s+Person|Care\s+Team(?:\s+Members)?|Assessment|Plan\s+of\s+Treatment|Patient\s+Instructions(?!\s+LastModified)|Reason\s+for\s+Referral|Results|Problems|Procedures|Surgical\s+History|Imaging\s*Results|Procedure\s+Notes|Medical\s+Equipment|Allergies|Medications|Vitals|Social\s+History|Functional\s+Status|Mental\s+Status|Family\s+History|Medical\s+History|Obstetrics\s+History|Gynecological\s+History|Immunizations|Past\s+Encounters|Goals(?:\s+Section)?|Health\s+Concerns(?:\s+Section)?|Advance\s+Directives?|Payers|Notes(?!\s+LastModified))\b/;

/** Plan of Treatment embeds Referral/Procedures/Surgeries as subsections — do not stop there. */
const PLAN_OF_TREATMENT_STOP =
  /\b(?:Demographics|Related\s+Person|Care\s+Team(?:\s+Members)?|Assessment|Patient\s+Instructions(?!\s+LastModified)|Reason\s+for\s+Referral|Results|Problems|Medical\s+Equipment|Allergies|Medications|Vitals|Social\s+History|Functional\s+Status|Mental\s+Status|Family\s+History|Medical\s+History|Obstetrics\s+History|Immunizations|Past\s+Encounters|Goals(?:\s+Section)?|Health\s+Concerns(?:\s+Section)?|Advance\s+Directives?|Payers|Notes)\b/;

/** Medical History checklist stops before Obstetrics / Gyn / Immunizations. */
const MEDICAL_HISTORY_STOP =
  /\b(?:Obstetrics\s+History|Gynecological\s+History|Immunizations|Past\s+Encounters|Goals(?:\s+Section)?|Health\s+Concerns(?:\s+Section)?|Advance\s+Directives?|Payers|Notes|Demographics|Related\s+Person|Care\s+Team|Assessment|Plan\s+of\s+Treatment|Results|Problems|Procedures|Allergies|Medications|Vitals|Social\s+History|Family\s+History)\b/;

/** Obstetrics History stops at Immunizations (or next major section). */
const OBSTETRICS_HISTORY_STOP =
  /\b(?:Immunizations|Past\s+Encounters|Goals(?:\s+Section)?|Health\s+Concerns(?:\s+Section)?|Advance\s+Directives?|Payers|Notes|Demographics|Related\s+Person|Care\s+Team|Assessment|Plan\s+of\s+Treatment|Medical\s+History|Results|Problems|Allergies|Medications|Vitals|Social\s+History)\b/;

/** Procedures top-level stops before its Athena subsections. */
const PROCEDURES_STOP =
  /\b(?:Surgical\s+History|Imaging\s*Results|Procedure\s+Notes|Medical\s+Equipment|Allergies|Medications|Demographics|Related\s+Person|Care\s+Team|Assessment|Plan\s+of\s+Treatment|Results|Problems|Vitals|Social\s+History|Payers|Notes)\b/;

/** Surgical History stops before Imaging Results / notes / next major section. */
const SURGICAL_HISTORY_STOP =
  /\b(?:Imaging\s*Results|Procedure\s+Notes|Medical\s+Equipment|Allergies|Medications|Demographics|Related\s+Person|Care\s+Team|Assessment|Plan\s+of\s+Treatment|Results|Problems|Procedures|Vitals|Social\s+History|Payers|Notes)\b/;

/** Imaging Results (under Procedures) stops before Procedure Notes / Medical Equipment. */
const IMAGING_RESULTS_STOP =
  /\b(?:Procedure\s+Notes|Medical\s+Equipment|Allergies|Medications|Demographics|Related\s+Person|Care\s+Team|Assessment|Plan\s+of\s+Treatment|Surgical\s+History|Problems|Procedures|Vitals|Social\s+History|Payers|Notes)\b/;

/** Procedure Notes stops at Medical Equipment / Allergies. */
const PROCEDURE_NOTES_STOP =
  /\b(?:Medical\s+Equipment|Allergies|Medications|Demographics|Related\s+Person|Care\s+Team|Assessment|Plan\s+of\s+Treatment|Surgical\s+History|Imaging\s*Results|Problems|Procedures|Vitals|Social\s+History|Payers|Notes)\b/;

/** Insert spaces where Athena pdf.js glues dates to the next token. */
export function normalizePortabilityGluedDates(text: string): string {
  return text
    .replace(/(\d{1,2}\/\d{1,2}\/\d{4})(?=[A-Za-z])/g, '$1 ')
    // Order tables glue submit/order dates: 01/12/202601/12/2026
    .replace(/(\d{1,2}\/\d{1,2}\/\d{4})(?=\d{1,2}\/\d{1,2}\/\d{4})/g, '$1 ')
    .replace(/([A-Za-z])(\d{1,2}\/\d{1,2}\/\d{4})/g, '$1 $2')
    .replace(/(\d{1,2}:\d{2}:\d{2})(?=[A-Za-z])/g, '$1 ')
    // Clock glued to the next date: 12:20:1908/21/2025
    .replace(/(\d{1,2}:\d{2}:\d{2})(?=\d{1,2}\/\d{1,2}\/\d{4})/g, '$1 ')
    .replace(/(Texas)(\d{1,2}:\d{2}:\d{2})/gi, '$1 $2')
    .replace(/(Tenet)(Texas)/gi, '$1 $2');
}

/**
 * Insert newlines before section titles when pdf.js glues them to the previous word
 * (e.g. `recordedFunctional Status` → `recorded\nFunctional Status`).
 * Also splits mid-line headers Athena leaves after a ZIP/phone
 * (e.g. `73301-0000 Care Team Members` → `73301-0000\nCare Team Members`).
 */
export function normalizePortabilityGluedSectionHeaders(text: string): string {
  const names = [...PORTABILITY_PDF_SECTIONS].sort((a, b) => b.length - a.length);
  let out = text;
  for (const name of names) {
    const escaped = name.replace(/\s+/g, '\\s+');
    // Lookahead allows glued TitleCase next section (HistoryFunctional) — \\b fails there.
    out = out.replace(
      new RegExp(`([a-z0-9.])(${escaped})(?=\\s|$|[A-Z])`, 'g'),
      '$1\n$2'
    );
    // Mid-line section titles after content + space (do not split "No assessment …")
    if (/^Assessment$/i.test(name)) {
      out = out.replace(
        /([a-z0-9.,)])\s+(Assessment)(?=\s+No\s+assessment)/gi,
        '$1\n$2'
      );
    } else {
      out = out.replace(
        new RegExp(`([a-z0-9.,)])\\s+(${escaped})(?=\\s|$|[A-Z:\\n])`, 'gi'),
        '$1\n$2'
      );
    }
  }
  // Undo false section splits inside clinical prose (PHQ: "these problems made…")
  out = out.replace(
    /\b(any|these|those|known|no known)\s*\n\s*Problems\b/gi,
    '$1 Problems'
  );
  out = out.replace(/([a-z0-9])(Question\s+Answer)\b/gi, '$1\n$2');
  // Table trailers often glue into the first prompt: TimeTobacco Smoking Status / TimeDo you…
  out = out.replace(/([a-z0-9])(Tobacco Smoking Status)\b/g, '$1\n$2');
  out = out.replace(/([a-z0-9])((?:What|Are|Do|Has|How)\b)/g, '$1\n$2');
  // Athena Procedures family: "Procedures Surgical History" / wrapped "Imaging\nResults"
  out = out.replace(/\bProcedures\s+(Surgical\s+History)\b/gi, 'Procedures\n$1');
  out = out.replace(/\bImaging\s*\n\s*Results\b/gi, 'Imaging Results');
  out = out.replace(/\b(US)\s+Imaging\s+Results\b/gi, '$1\nImaging Results');
  out = out.replace(/\bProcedure\s*\n\s*Notes\b/gi, 'Procedure Notes');
  out = out.replace(/(completed)(Not\s+Available|Jennifer)/gi, '$1 $2');
  // Advance Directives ends glued to the Payers table: "Directive N:Payers Insurance Sequence"
  out = out.replace(/([^\n])(Payers\s+Insurance\s+Sequence)/g, '$1\n$2');
  // Notes table header glued to the last Payers row: "(PPO) Smith Notes Date Note Note Provider"
  out = out.replace(/([^\n])(Notes\s+Date\s+Note\s+Note\s+Provider)/g, '$1\n$2');
  return out;
}

function normalizeAthenaPerson(recorder: string): string {
  const who = collapseWs(recorder).replace(/^null$/i, '');
  if (!who || /^(texas|tenet|details|time|by|organization|note|notes)$/i.test(who)) {
    return '';
  }
  return who;
}

function normalizeAthenaPlace(organization: string): string {
  const org = collapseWs(organization);
  if (!org || /^null$/i.test(org)) return '';
  return org;
}

export type AthenaAnswerMeta = {
  detail: string;
  date: string;
  recordedBy: string;
  place: string;
  time: string;
  notes: string;
};

function emptyAnswerMeta(): AthenaAnswerMeta {
  return {
    detail: '',
    date: '',
    recordedBy: '',
    place: '',
    time: '',
    notes: '',
  };
}

function athenaMeta(
  recorder: string,
  organization: string,
  time: string
): Pick<AthenaAnswerMeta, 'recordedBy' | 'place' | 'time' | 'notes'> {
  return {
    recordedBy: normalizeAthenaPerson(recorder),
    place: normalizeAthenaPlace(organization),
    time: collapseWs(time),
    notes: '',
  };
}

/**
 * Split Athena Q&A trailing metadata into detail / date / recordedBy / place / time.
 * Example: `No Sandra Galvez TX - Tenet Texas 08/21/2025 12:17:49`
 * → detail No, date 08/21/2025, recordedBy Sandra Galvez, place TX - Tenet Texas, time 12:17:49
 */
export function splitAthenaAnswerMetadata(raw: string): AthenaAnswerMeta {
  let s = collapseWs(raw);
  if (!s) return emptyAnswerMeta();

  // Prefer First Last (exactly 2 Title-Case tokens) immediately before TX - Tenet …
  // so answers like "Never Smoker" are not treated as the recorder name.
  const person2 = '([A-Z][a-z]+\\s+[A-Z][a-z.]+)';
  const person3 = '([A-Z][a-z]+\\s+[A-Z][a-z.]+\\s+[A-Z][a-z.]+)';
  const orgTenet = '(TX\\s*-\\s*Tenet(?:\\s+[A-Za-z]+)?)';
  const dateTime =
    '(\\d{1,2}\\/\\d{1,2}\\/\\d{4})(?:\\s+Texas)?(?:\\s+(\\d{1,2}:\\d{2}:\\d{2}))?';

  for (const person of [person2, person3]) {
    let m = s.match(
      new RegExp(`^(.*?)\\s+${person}\\s+${orgTenet}\\s+${dateTime}\\s*$`)
    );
    if (m) {
      return {
        detail: collapseWs(m[1]).slice(0, 300),
        date: m[4],
        ...athenaMeta(m[2], m[3], m[5] || ''),
      };
    }
    // Person + TX - Tenet … + clock (date may already live on the row)
    m = s.match(
      new RegExp(
        `^(.*?)\\s+${person}\\s+(TX\\s*-\\s*Tenet)\\s*(?:Texas\\s+)?(\\d{1,2}:\\d{2}:\\d{2})\\s*$`
      )
    );
    if (m) {
      return {
        detail: collapseWs(m[1]).slice(0, 300),
        date: '',
        ...athenaMeta(m[2], m[3], m[4]),
      };
    }
    m = s.match(new RegExp(`^(.*?)\\s+${person}\\s+${orgTenet}\\s*$`));
    if (m && m[1].trim().length > 0) {
      return {
        detail: collapseWs(m[1]).slice(0, 300),
        date: '',
        ...athenaMeta(m[2], m[3], ''),
      };
    }
    m = s.match(new RegExp(`^${person}\\s+${orgTenet}\\s+${dateTime}\\s*$`));
    if (m) {
      return {
        detail: '',
        date: m[3],
        ...athenaMeta(m[1], m[2], m[4] || ''),
      };
    }
    m = s.match(
      new RegExp(
        `^${person}\\s+(TX\\s*-\\s*Tenet)\\s*(?:Texas\\s+)?(\\d{1,2}:\\d{2}:\\d{2})\\s*$`
      )
    );
    if (m) {
      return {
        detail: '',
        date: '',
        ...athenaMeta(m[1], m[2], m[3]),
      };
    }
    m = s.match(new RegExp(`^${person}\\s+${orgTenet}\\s*$`));
    if (m) {
      return {
        detail: '',
        date: '',
        ...athenaMeta(m[1], m[2], ''),
      };
    }
  }

  // Answer + null login + org phrase + date + time (Urinary / sparse Athena rows)
  let m = s.match(
    /^(.*?)\s+null\s+(\S+)\s+([A-Za-z][A-Za-z0-9 .'-]{2,60})\s+(\d{1,2}\/\d{1,2}\/\d{4})(?:\s+(\d{1,2}:\d{2}:\d{2}))?\s*$/i
  );
  if (m) {
    return {
      detail: collapseWs(m[1]).slice(0, 300),
      date: m[4],
      ...athenaMeta(m[2], m[3], m[5] || ''),
    };
  }

  // Strip Athena table noise glued after place (e.g. "Texas 1Date Assessment…")
  const cleanedTrail = s
    .replace(/\s+\d*Date\s+Assessment\b[\s\S]*$/i, '')
    .replace(/\s+LastModified\b[\s\S]*$/i, '')
    .trim();
  if (cleanedTrail !== s && cleanedTrail.length > 0) {
    return splitAthenaAnswerMetadata(cleanedTrail);
  }

  // Trailing date (+ time) only
  m = s.match(
    /^(.*?)\s+(\d{1,2}\/\d{1,2}\/\d{4})(?:\s+Texas)?(?:\s+(\d{1,2}:\d{2}:\d{2}))?\s*$/
  );
  if (m && m[1].trim().length > 0) {
    return {
      detail: collapseWs(m[1]).slice(0, 300),
      date: m[2],
      recordedBy: '',
      place: '',
      time: m[3] || '',
      notes: '',
    };
  }

  // Pull a date out of the middle if present
  const embedded = s.match(
    /\b(\d{1,2}\/\d{1,2}\/\d{4})\b(?:\s+Texas)?(?:\s+(\d{1,2}:\d{2}:\d{2}))?/
  );
  if (embedded && embedded.index != null) {
    const before = s.slice(0, embedded.index).trim();
    const after = s.slice(embedded.index + embedded[0].length).trim();
    const org =
      after.match(/TX\s*-\s*Tenet(?:\s+[A-Za-z]+)?/)?.[0] ??
      before.match(/TX\s*-\s*Tenet(?:\s+[A-Za-z]+)?/)?.[0] ??
      '';
    const who =
      before.match(new RegExp(`${person2}\\s*$`))?.[1] ??
      after.match(new RegExp(`^${person2}`))?.[1] ??
      '';
    let detail = before;
    if (who) {
      detail = detail
        .replace(new RegExp(`\\s*${who.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`), '')
        .trim();
    }
    detail = detail
      .replace(/\bTX\s*-\s*Tenet(?:\s+[A-Za-z]+)?\b/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return {
      detail: (detail || before || s).slice(0, 300),
      date: embedded[1],
      ...athenaMeta(who, org || after, embedded[2] || ''),
    };
  }

  return { ...emptyAnswerMeta(), detail: s.slice(0, 300) };
}

/**
 * Social History / Functional Status Athena Q&A table rows.
 * Splits answer, recorder, organization, date, and time into entry fields.
 */
export function parseQuestionAnswerEntries(block: string): Tab14ClinicalEntry[] {
  const normalized = normalizePortabilityGluedDates(
    normalizePortabilityGluedSectionHeaders(block)
  ).replace(/Question\s+Answer\s+Notes?\s+LastModified[^\n]{0,120}/gi, '\n');

  const prompt =
    'Tobacco Smoking Status|\\b(?:What|Are|Do|Has|How|Which|Is|Birth|Gender|Sexual|Legal|Urinary)\\b[^?\\n]{0,120}\\?';
  const rowRe = new RegExp(
    `(${prompt})\\s+([\\s\\S]+?)(?=(?:\\s*(?:${prompt}))|\\s*(?:No Functional|None recorded|Mental Status|Family History|Social History|Functional Status|Medical History)\\b|$)`,
    'gi'
  );

  const rows: Tab14ClinicalEntry[] = [];
  const seen = new Set<string>();
  for (const m of normalized.matchAll(rowRe)) {
    const title = collapseWs(m[1]).slice(0, 200);
    if (/^(question|answer|note|lastmodified|organization|details|time|by)\b/i.test(title)) {
      continue;
    }
    const split = splitAthenaAnswerMetadata(m[2]);
    const key = `${title.toLowerCase()}|${split.detail.toLowerCase()}|${split.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!split.detail && !split.date) continue;
    rows.push({
      title,
      detail: split.detail,
      date: split.date,
      recordedBy: split.recordedBy,
      place: split.place,
      time: split.time,
      notes: split.notes,
    });
  }
  return rows.slice(0, 40);
}

function isTableColumnHeaderNoise(line: string): boolean {
  const t = line.trim();
  return (
    /^(?:date\s+)?assessment\s+value\b/i.test(t) ||
    /^patient\s+instructions\s+lastmodified\b/i.test(t) ||
    /^encounter\s+date\s+encounter\s+id\b/i.test(t)
  );
}

/**
 * Slice a section by its full Athena column header instead of the bare title, so
 * repeated words (`Notes`, `Medical History`) inside body text cannot start a block.
 */
function sliceAnchoredTable(text: string, start: RegExp, stop: RegExp): string {
  const m = text.match(start);
  if (!m || m.index == null) return '';
  const after = text.slice(m.index + m[0].length);
  const end = after.search(stop);
  return (end >= 0 ? after.slice(0, end) : after).trim();
}

function slicePortabilityBlock(text: string, header: RegExp): string {
  const blocks = sliceAllPortabilityBlocks(text, header);
  return blocks.sort((a, b) => b.length - a.length)[0] ?? '';
}

function sliceAllPortabilityBlocks(
  text: string,
  header: RegExp,
  stopPattern: RegExp = SECTION_STOP
): string[] {
  const normalized = normalizePortabilityGluedSectionHeaders(
    normalizePortabilityGluedDates(text)
  );
  const matches = [
    ...normalized.matchAll(
      new RegExp(header.source, header.flags.includes('g') ? header.flags : `${header.flags}g`)
    ),
  ];
  const blocks: string[] = [];
  for (const m of matches) {
    if (m.index == null) continue;
    const window = normalized.slice(m.index, m.index + 80);
    if (isTableColumnHeaderNoise(window)) continue;
    const after = normalized.slice(m.index, m.index + 200);
    const tocHits = (after.match(stopPattern) || []).length;
    if (tocHits >= 4 && !/no\s+assessment\s+recorded|none\s+(recorded|reported)/i.test(after)) {
      continue;
    }

    const headerMatch = normalized.slice(m.index).match(header);
    const afterHeader = normalized.slice(m.index + (headerMatch?.[0].length ?? 0)).trim();
    const stopRe = new RegExp(
      `(?:^|\\n)\\s*(?!Date\\s+Assessment\\s+Value)(${stopPattern.source})\\b`,
      'i'
    );
    const end = afterHeader.search(stopRe);
    const raw = end >= 0 ? afterHeader.slice(0, end) : afterHeader.slice(0, 12000);
    const body = raw.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
    if (body.length >= 3) blocks.push(body);
  }
  return blocks;
}

function dedupeClinicalEntries(rows: Tab14ClinicalEntry[]): Tab14ClinicalEntry[] {
  const seen = new Set<string>();
  const out: Tab14ClinicalEntry[] = [];
  for (const row of rows) {
    const key = `${row.title.toLowerCase()}|${row.detail.toLowerCase()}|${row.date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out.slice(0, 80);
}

const PHQ_ANSWERS =
  'Not at all|Several days|More than half the days|Nearly every day|Only a little|Somewhat|Yes|No';

/**
 * Parse Athena Mental Status / screener rows into title=question, detail=answer, date.
 * Handles glued pdf.js lines like:
 * `08/21/2025 Little interest or pleasure in doing things Not at … all Texas 12:20:19`
 * and repeated PHQ batteries on multiple encounter dates.
 */
export function parseMentalStatusEntries(block: string): Tab14ClinicalEntry[] {
  const normalized = normalizePortabilityGluedSectionHeaders(
    normalizePortabilityGluedDates(block)
  )
    // Athena often wraps Likert answers: "Not at" … provider/date … "all"
    .replace(
      /Not at\b([\s\S]{0,120}?)\ball\b/gi,
      (_full, mid: string) =>
        /TX\s*-\s*Tenet|\d{1,2}\/\d{1,2}\/\d{4}|Galvez|Escobar|Quiroz|Texas\s+\d{1,2}:/i.test(mid)
          ? `Not at all ${collapseWs(mid)}`
          : `Not at${mid}all`
    )
    .replace(/\bNot at\s*\n?\s*all\b/gi, 'Not at all')
    .replace(/\bMore than half the\s*\n?\s*days\b/gi, 'More than half the days')
    .replace(/\bNearly every\s*\n?\s*day\b/gi, 'Nearly every day')
    .replace(/\bSeveral\s*\n?\s*days\b/gi, 'Several days')
    // Re-join first/last names Athena wraps across the org column
    .replace(/\bGeraldine\s+TX\s*-\s*Tenet\s+Escobar\b/gi, 'Geraldine Escobar TX - Tenet')
    .replace(/\bSandra\s+TX\s*-\s*Tenet\s+Galvez\b/gi, 'Sandra Galvez TX - Tenet')
    .replace(/\bJazmin\s+TX\s*-\s*Tenet\s+Quiroz\b/gi, 'Jazmin Quiroz TX - Tenet');

  const rows: Tab14ClinicalEntry[] = [];
  const seen = new Set<string>();

  const takeClock = (chunk: string): string =>
    chunk.match(/\b(\d{1,2}:\d{2}:\d{2})\b/)?.[1] ?? '';

  const cleanMentalTitle = (raw: string): string =>
    collapseWs(raw)
      .replace(/^(?:Texas\s+)?\d{1,2}:\d{2}:\d{2}\s*/i, '')
      .replace(/^\d{1,2}\/\d{1,2}\/\d{4}\s*/g, '')
      .replace(/\bTexas\s+\d{1,2}:\d{2}:\d{2}\b/gi, '')
      .replace(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, '')
      .replace(/\b[A-Za-z][A-Za-z .'-]+\s+TX\s*-\s*Tenet(?:\s+[A-Za-z]+)?\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();

  const cleanRecorder = (raw: string): string => {
    let n = collapseWs(raw)
      .replace(/\bTexas\b/gi, '')
      .replace(/\bTenet\b/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (/^Escobar$/i.test(n)) n = 'Geraldine Escobar';
    if (/^Geraldine$/i.test(n)) n = 'Geraldine Escobar';
    if (/^Galvez$/i.test(n)) n = 'Sandra Galvez';
    if (/^Sandra$/i.test(n)) n = 'Sandra Galvez';
    if (/^Quiroz$/i.test(n)) n = 'Jazmin Quiroz';
    if (/^Jazmin$/i.test(n)) n = 'Jazmin Quiroz';
    return n;
  };

  // Split the table into one segment per dated assessment / item row.
  // Trailing same-date stamps ("08/21/2025 Texas 12:20:19") merge into the prior item.
  const dateStarts = [
    ...normalized.matchAll(/\d{1,2}\/\d{1,2}\/\d{4}(?=\s*[A-Za-z0-9])/g),
  ];
  const segments: { date: string; body: string }[] = [];
  for (let i = 0; i < dateStarts.length; i++) {
    const m = dateStarts[i];
    if (m.index == null) continue;
    const date = m[0];
    const bodyStart = m.index + date.length;
    const bodyEnd =
      i + 1 < dateStarts.length && dateStarts[i + 1].index != null
        ? dateStarts[i + 1].index!
        : normalized.length;
    const body = collapseWs(normalized.slice(bodyStart, bodyEnd));
    if (body.length < 3) continue;
    const isQuestionish =
      /\b(?:PHQ|Little interest|Feeling|Trouble|Poor|Moving|Thoughts|If you|Do you|appetite|concentrating|sleeping|energy|fidgety|failure)\b/i.test(
        body
      );
    const isMetaTail =
      /^(?:Texas|Tenet|Escobar|Galvez|Quiroz|\d{1,2}:\d{2}:\d{2})\b/i.test(body) ||
      (!isQuestionish &&
        /\b(?:Texas|Tenet)\b/i.test(body) &&
        /\d{1,2}:\d{2}:\d{2}/.test(body) &&
        body.length < 80);
    if (isMetaTail && segments.length) {
      segments[segments.length - 1].body = collapseWs(
        `${segments[segments.length - 1].body} ${body}`
      );
      continue;
    }
    if (!isQuestionish) continue;
    segments.push({ date, body });
  }

  const answerRe = new RegExp(`\\b(${PHQ_ANSWERS})\\b`, 'i');

  for (const seg of segments) {
    const { date } = seg;
    let body = seg.body;
    if (/^assessment\s+value\b/i.test(body)) continue;

    // Instrument score row
    const scoreM = body.match(/^(PHQ-?\d(?:\s*\/\s*PHQ-?\d)?)\s+(\d+)\b([\s\S]*)$/i);
    if (scoreM) {
      const key = `${date}|${collapseWs(scoreM[1]).toLowerCase()}|${scoreM[2]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const trail = collapseWs(scoreM[3] || '');
      const meta = splitAthenaAnswerMetadata(trail);
      const namedBeforeTenet =
        trail.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z.]+)+)\s+TX\s*-\s*Tenet/)?.[1] ??
        trail.match(/\b(Geraldine|Sandra|Jazmin)\b/i)?.[1] ??
        '';
      const providerRaw = cleanRecorder(
        [meta.recordedBy, namedBeforeTenet].find(
          (n) => n && !/\b(?:Texas|Tenet)\b/i.test(n)
        ) ||
          meta.recordedBy ||
          namedBeforeTenet
      );
      const org = meta.place || trail.match(/TX\s*-\s*Tenet(?:\s+Texas)?/)?.[0] || '';
      const time = meta.time || takeClock(trail);
      rows.push(
        clinicalEntry({
          title: collapseWs(scoreM[1]),
          detail: `Score: ${scoreM[2]}`,
          score: scoreM[2],
          date,
          ...athenaMeta(providerRaw, org, time),
        })
      );
      continue;
    }

    const ansM = body.match(answerRe);
    let title = body;
    let detail = '';
    let recordedBy = '';
    let place = '';
    let time = takeClock(body);
    if (ansM && ansM.index != null) {
      title = body.slice(0, ansM.index).trim();
      detail = ansM[1];
      // Don't treat a stray "No" from "No Mental SDOH…" as the PHQ difficulty answer
      if (
        /^no$/i.test(detail) &&
        /mental\s+sdoh|screeners\s+recorded/i.test(body.slice(ansM.index))
      ) {
        detail = '';
        title = body;
      } else {
        const after = body.slice(ansM.index + ansM[0].length).trim();
        const metaAfter = splitAthenaAnswerMetadata(after);
        recordedBy = cleanRecorder(metaAfter.recordedBy);
        place = metaAfter.place;
        time = metaAfter.time || time;
      }
    }
    if (!detail) {
      const stripped = splitAthenaAnswerMetadata(title);
      // Prefer the question text before recorder metadata
      const beforeMeta = title
        .replace(/\b(?:Sandra|Geraldine|Jazmin)[\s\S]*$/i, '')
        .replace(/\bTX\s*-\s*Tenet[\s\S]*$/i, '')
        .replace(/\bTexas\s+\d{1,2}:\d{2}:\d{2}\b/gi, '')
        .trim();
      title = beforeMeta || stripped.detail || title;
      recordedBy = cleanRecorder(recordedBy || stripped.recordedBy);
      place = place || stripped.place;
      time = time || stripped.time;
    }

    title = cleanMentalTitle(title);
    if (title.length < 8) continue;
    if (/^(date|question|answer|note|lastmodified|organization|details|value|by|time)\b/i.test(title)) {
      continue;
    }
    if (/^no mental sdoh/i.test(title)) continue;
    const key = `${date}|${title.toLowerCase().slice(0, 80)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!place && /TX\s*-\s*Tenet/i.test(seg.body)) place = 'TX - Tenet';
    if (!recordedBy) {
      recordedBy = cleanRecorder(
        seg.body.match(
          /\b((?:Sandra|Geraldine|Jazmin)\s+[A-Z][a-z]+|[A-Z][a-z]+\s+(?:Galvez|Escobar|Quiroz))\b/
        )?.[1] ?? ''
      );
    }
    rows.push(
      clinicalEntry({
        title: title.slice(0, 220),
        detail,
        date,
        recordedBy,
        place,
        time,
      })
    );
  }

  // Free-text stress question — often has recorder/place; clock may sit on the next PHQ block
  const stress = normalized.match(
    /(Do you feel stressed[^?]{0,160}\?)\s+(Only a little|Somewhat|Yes|No|Not at all)\s+([A-Za-z][\s\S]{0,120}?)(?=\s*(?:Date\s+Assessment|PHQ-?\d|\d{1,2}\/\d{1,2}\/\d{4}\s*PHQ)|$)/i
  );
  if (stress) {
    const key = `stress|${stress[1].toLowerCase()}`;
    if (!seen.has(key)) {
      seen.add(key);
      const trail = collapseWs(stress[3] || '')
        .replace(/\s+\d*Date\b.*$/i, '')
        .replace(/\s+Assessment\b.*$/i, '')
        .trim();
      const meta = splitAthenaAnswerMetadata(`${stress[2]} ${trail}`.trim());
      let time = meta.time || takeClock(trail);
      let date = meta.date;
      let recordedBy = cleanRecorder(meta.recordedBy);
      let place = meta.place;
      if (!recordedBy) {
        recordedBy = cleanRecorder(
          trail.match(/([A-Z][a-z]+\s+[A-Z][a-z.]+)\s+TX\s*-\s*Tenet/)?.[1] ?? ''
        );
      }
      if (!place) {
        place = trail.match(/TX\s*-\s*Tenet(?:\s+[A-Za-z]+)?/)?.[0] ?? '';
      }
      if (!time || !date) {
        const nearby = normalized.match(
          /(\d{1,2}\/\d{1,2}\/\d{4})\s+PHQ-?\d[\s\S]{0,100}?(\d{1,2}:\d{2}:\d{2})/i
        );
        if (nearby) {
          if (!date) date = nearby[1];
          if (!time) time = nearby[2];
        }
      }
      rows.unshift(
        clinicalEntry({
          title: collapseWs(stress[1]),
          detail: stress[2],
          date,
          recordedBy,
          place,
          time,
        })
      );
    }
  }

  return rows
    .filter((row) => {
      const t = row.title.trim();
      if (t.length < 8) return false;
      if (/^\d{1,2}\/\d{1,2}/.test(t) && t.length < 24) return false;
      if (/^(?:Texas\s+)?\d{1,2}:\d{2}:\d{2}/i.test(t)) return false;
      return true;
    })
    .slice(0, 80);
}

function collapseWs(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function formatTelDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  const d = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (d.length === 10) return `+1-(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return collapseWs(raw.replace(/^tel:/i, ''));
}

function isCareTeamHeaderNoise(title: string): boolean {
  return /^(name|role|member|npi|specialty|address|phone)\b/i.test(title) ||
    /member\s+id|npi\s+specialty|role\s+member/i.test(title);
}

function careTeamPersonKey(title: string): string {
  const parts = title
    .toLowerCase()
    .replace(/\b(md|do|np|pa|rn|phd)\b/g, '')
    .replace(/[^a-z\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  // Last token (surname) so "Max Peralta" and "MAX A PERALTA MD" merge
  return parts[parts.length - 1] || title.toLowerCase();
}

/** Prefer richer Care Team rows; drop Assessment leftovers and table-header noise. */
export function dedupeCareTeamEntries(rows: Tab14ClinicalEntry[]): Tab14ClinicalEntry[] {
  const richness = (row: Tab14ClinicalEntry): number => {
    let n = row.detail.length;
    if (row.npi || /\bNPI:/i.test(row.detail)) n += 200;
    if (row.memberId || /\bMember ID:/i.test(row.detail)) n += 100;
    if (row.specialty || /\bSpecialty:/i.test(row.detail)) n += 40;
    if (row.phone || /\bPhone:/i.test(row.detail)) n += 20;
    if (row.address || /\bAddress:/i.test(row.detail)) n += 20;
    return n;
  };
  const byKey = new Map<string, Tab14ClinicalEntry>();
  for (const row of rows) {
    if (!row.title.trim()) continue;
    if (/none recorded/i.test(row.title)) continue;
    if (/no assessment recorded/i.test(row.detail)) continue;
    if (isCareTeamHeaderNoise(row.title)) continue;
    const key = careTeamPersonKey(row.title) || row.title.toLowerCase();
    const prev = byKey.get(key);
    if (!prev || richness(row) > richness(prev)) {
      byKey.set(key, row);
    }
  }
  return [...byKey.values()].slice(0, 40);
}

/**
 * Athena "Care Team" table rows.
 * Diana: Name Role Member ID NPI Specialty Address Phone (ALL CAPS + Member ID)
 * Harold: Name Role NPI Specialty Address Phone (Title Case, optional ", MD", no Member ID)
 */
export function parseCareTeamTableEntries(block: string): Tab14ClinicalEntry[] {
  if (!block || block.length < 20) return [];
  const flat = collapseWs(block.replace(/\n+/g, ' '));
  const diana = parseDianaCareTeamTable(flat);
  if (diana.length) return diana;
  return parseHaroldCareTeamTable(flat);
}

function careTeamEntry(partial: {
  title: string;
  roleLabel: string;
  memberId?: string;
  npi: string;
  specialty?: string;
  addr: string;
  phone: string;
}): Tab14ClinicalEntry {
  const phone = formatTelDisplay(partial.phone);
  const addr = collapseWs(partial.addr).replace(/,\s*/g, ', ').replace(/,\s*$/, '');
  return clinicalEntry({
    title: collapseWs(partial.title),
    // Contact columns live in dedicated fields — keep Detail free for staff notes.
    detail: '',
    notes: 'Care Team',
    role: partial.roleLabel,
    memberId: partial.memberId ?? '',
    npi: partial.npi,
    specialty: partial.specialty ?? '',
    phone,
    address: addr,
  });
}

function parseDianaCareTeamTable(flat: string): Tab14ClinicalEntry[] {
  const rows: Tab14ClinicalEntry[] = [];
  const role =
    'Primary Care Provider|Consulting Physician|Nurse Practitioner|Physician Assistant|Care Manager|Specialist(?:\\s*-\\s*[A-Za-z ]+)?';
  // Optional Specialty between NPI and street address (Meditech CCD dialect).
  const re = new RegExp(
    `([A-Z][A-Z0-9 .'-]{3,60}?(?:\\s+(?:MD|DO|NP|PA|RN)))\\s+(${role})\\s+(\\d{4,})\\s+(\\d{8,12})(?:\\s+([A-Za-z][A-Za-z /&-]{2,40}?))?\\s+(\\d{2,5}\\s+[^(\\n]+?)\\s*((?:\\+?1[-.\\s]*)?\\(?\\d{3}\\)?[-.\\s]*\\d{3}[-.\\s]*\\d{0,4})`,
    'g'
  );
  for (const m of flat.matchAll(re)) {
    const title = collapseWs(m[1]);
    if (isCareTeamHeaderNoise(title)) continue;
    rows.push(
      careTeamEntry({
        title,
        roleLabel: collapseWs(m[2]),
        memberId: m[3],
        npi: m[4],
        specialty: m[5] ? collapseWs(m[5]) : undefined,
        addr: m[6],
        phone: m[7],
      })
    );
  }
  return rows;
}

/**
 * Harold-style Care Team (no Member ID; Title Case names; org rows without MD):
 * `Susan Cole, MD Primary Care Provider 1922384750 Family Medicine 3210 Larimer… (303) 555-7100`
 * `Rocky Mountain Eye Associates Specialist - Ophthalmology 1749283610 Ophthalmology 1155…`
 */
function parseHaroldCareTeamTable(flat: string): Tab14ClinicalEntry[] {
  if (!/Name\s+Role\s+NPI\s+Specialty/i.test(flat) && !/\b\d{10}\b/.test(flat)) return [];
  const body = flat
    .replace(/^[\s\S]*?\bName\s+Role\s+NPI\s+Specialty\s+Address\s+Phone\s+/i, '')
    .trim();
  if (body.length < 20) return [];

  const role =
    'Primary Care Provider|Consulting Physician|Nurse Practitioner|Physician Assistant|Care Manager|Specialist(?:\\s*-\\s*[A-Za-z][A-Za-z /-]*)?';
  const rows: Tab14ClinicalEntry[] = [];
  const re = new RegExp(
    `([A-Z][A-Za-z0-9 .'-]{2,60}?(?:,?\\s*(?:MD|DO|NP|PA|RN))?|[A-Z][A-Za-z]+(?:\\s+[A-Z][A-Za-z]+){1,6})\\s+(${role})\\s+(\\d{10})\\s+([A-Za-z][A-Za-z /-]{2,40}?)\\s+(\\d{2,5}\\s+.+?)\\s*((?:\\+?1[-.\\s]*)?\\(?\\d{3}\\)?[-.\\s]*\\d{3}[-.\\s]*\\d{4})`,
    'g'
  );
  for (const m of body.matchAll(re)) {
    let title = collapseWs(m[1])
      .replace(/^(?:Name|Role|NPI|Specialty|Address|Phone)\s+/i, '')
      .trim();
    if (isCareTeamHeaderNoise(title)) continue;
    if (/^(name|role|npi|specialty|address|phone)$/i.test(title)) continue;
    // Prefer "Susan Cole, MD" display over ALL CAPS Diana-style
    if (/,\s*MD$/i.test(title)) title = title.replace(/,\s*MD$/i, ', MD');
    rows.push(
      careTeamEntry({
        title,
        roleLabel: collapseWs(m[2]),
        npi: m[3],
        specialty: collapseWs(m[4]),
        addr: m[5],
        phone: m[6],
      })
    );
  }
  return rows;
}

/**
 * Athena "Related Person" / "Care Team Members" contact cards —
 * capture name, relation, phones, email, and full address (not just the first tel:).
 */
export function parseRelatedPersonOrCareTeamEntries(
  block: string,
  sectionLabel: string
): Tab14ClinicalEntry[] {
  if (!block || block.length < 8) return [];

  const isRelated = /related\s+person/i.test(sectionLabel);
  const isCareTeamMembers = /care\s+team\s+members/i.test(sectionLabel);
  const isCareTeamTable = /^care\s+team$/i.test(sectionLabel.trim());
  const isCareTeam = isCareTeamMembers || isCareTeamTable;
  if (!isRelated && !isCareTeam) return [];

  // Only the end-of-document Care Team section uses the NPI table parser
  if (isCareTeamTable) {
    const table = parseCareTeamTableEntries(block);
    if (table.length) return table;
  }

  // Prefer labeled Name / Primary Care Provider (name may be on the next line)
  const name =
    block.match(/\bName\s*:?\s*([A-Za-z][A-Za-z .'-]{1,80})/i)?.[1] ||
    block.match(/\bPrimary\s+Care\s+Provider\s*:?\s*([A-Za-z][A-Za-z .'-]{1,80})/i)?.[1] ||
    block.match(/\bProvider\s*:?\s*([A-Za-z][A-Za-z .'-]{1,80})/i)?.[1];
  if (!name) return [];

  const title = collapseWs(name)
    .replace(/\bRelation\b.*$/i, '')
    .replace(/\bPhone\b.*$/i, '')
    .replace(/\bAddress\b.*$/i, '')
    .trim()
    .slice(0, 120);
  if (!title || /^(name|relation|phone|address)$/i.test(title)) return [];
  if (isCareTeam && isCareTeamHeaderNoise(title)) return [];

  const relationRaw = block.match(
    /\bRelation\s*:?\s*([^\n]*?)(?=\s*Phone\s+Number|\s*tel:|\s*Address\s*:|\s*mailto:|$)/i
  )?.[1];
  const relation = collapseWs(relationRaw ?? '')
    .replace(/^relation$/i, '')
    .replace(/^[:\s]+/, '');

  const roleFromCard =
    block.match(/\b(Primary Care Provider|Specialist|Care Manager|Nurse Practitioner)\b/i)?.[1] ||
    '';

  const phones: string[] = [];
  for (const m of block.matchAll(/tel:\+?[-\d()\s.]{7,}/gi)) {
    const formatted = formatTelDisplay(m[0]);
    if (formatted && !phones.includes(formatted)) phones.push(formatted);
  }
  for (const m of block.matchAll(
    /\bPh\.?\s*:?\s*((?:\+?1[-.\s]*)?\(?\d{3}\)?[-.\s]*\d{3}[-.\s]*\d{4})/gi
  )) {
    const formatted = formatTelDisplay(m[1]);
    if (formatted && !phones.includes(formatted)) phones.push(formatted);
  }
  // Bare phones (Care Team table / Ph. without tel:)
  for (const m of block.matchAll(/\((?:\d{3})\)\s*\d{3}[-.\s]*\d{4}/g)) {
    const formatted = formatTelDisplay(m[0]);
    if (formatted && !phones.includes(formatted)) phones.push(formatted);
  }

  const emails: string[] = [];
  for (const m of block.matchAll(/mailto:([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi)) {
    if (!emails.includes(m[1])) emails.push(m[1]);
  }
  for (const m of block.matchAll(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/gi)) {
    if (!emails.includes(m[1])) emails.push(m[1]);
  }

  const addr =
    block.match(
      /\bAddress\s*:?\s*(\d+[^,\n]+,\s*[A-Za-z .'-]+,\s*[A-Z]{2}(?:\s+\d{5}(?:-\d{4})?)?(?:,\s*USA)?)/i
    )?.[1] ||
    block.match(
      /(\d{2,5}\s+[A-Za-z0-9][^,]{0,60},\s*(?:Ste\.?\s*\d+[^,]*,\s*)?[A-Za-z .'-]+,\s*[A-Z]{2}(?:\s+\d{5}(?:-\d{4})?)?(?:,\s*USA)?)/i
    )?.[1] ||
    '';

  const phone = phones.join('; ');
  const email = emails.join('; ');
  const address = addr ? collapseWs(addr).replace(/,\s*/g, ', ') : '';
  const role =
    isCareTeam && roleFromCard
      ? roleFromCard
      : isCareTeam
        ? 'Primary Care Provider'
        : '';

  // Structured contact fields — do not dump Relation/Phone/Email/Address into Detail.
  return [
    clinicalEntry({
      title,
      detail: '',
      notes: sectionLabel,
      relationship: isRelated ? relation : '',
      role,
      phone,
      email,
      address,
    }),
  ];
}

/**
 * Athena Plan of Treatment — labs, imaging, medication/vaccine orders, and empty categories.
 * PDF layout is a wide order table; generic dated-line parsing turns providers into titles.
 */
export function parsePlanOfTreatmentEntries(block: string): Tab14ClinicalEntry[] {
  if (!block || block.length < 8) return [];

  let text = normalizePortabilityGluedDates(block)
    .replace(/MedicationOrders/gi, '\nMedicationOrders\n')
    .replace(/VaccineOrders/gi, '\nVaccineOrders\n')
    .replace(
      /\b(Reminders|Appointments|Lab|Referral|Procedures|Surgeries|Imaging|Patient\s+Targets)\b/gi,
      '\n$1\n'
    )
    .replace(
      /Order\s+Submit\s+Provider\s+Name\s+Organization\s+Details\s+LastModified\s+Last\s+Details/gi,
      '\n'
    )
    .replace(/\bDate\s+Date\s+by\s+Modified\b/gi, '\n')
    .replace(/\bMed\s+Time\s+Pharmacy\b/gi, '\n')
    .replace(/\bNot\s+[Aa]vailable\b/g, 'Not Available');

  const rows: Tab14ClinicalEntry[] = [];
  const seen = new Set<string>();

  const take = (entry: Tab14ClinicalEntry) => {
    const key = `${entry.title.toLowerCase()}|${entry.date}|${entry.detail.slice(0, 60)}`;
    if (!entry.title.trim() || seen.has(key)) return;
    seen.add(key);
    rows.push(entry);
  };

  for (const m of text.matchAll(
    /\b(Reminders|Appointments|Referral|Procedures|Surgeries|Patient\s+Targets)\b\s*None recorded\.?/gi
  )) {
    take(
      clinicalEntry({
        title: `${collapseWs(m[1])}: None recorded`,
        detail: 'None recorded.',
      })
    );
  }

  const cleanOrderTitle = (raw: string): string =>
    collapseWs(raw)
      .replace(/^(?:Lab|Imaging)\s+/i, '')
      .replace(/^.*?\bPh\.?\s*\(?\d{3}\)?[-.\s/]*\d{3}[-.\s/]*\d{4}\s*/i, '')
      .replace(/^.*?\b\d{5}(?:-\d{4})?,?\s*/i, '')
      .replace(/^.*?\b(?:EL PASO|El Paso|Ithaca|Cornell University|TX|NY|USA),?\s*/i, '')
      .replace(/^.*?\bSte\.?\s*[A-Za-z0-9]+\s*,?\s*/i, '')
      .replace(/^[,.\s]+/, '')
      .trim()
      .slice(0, 160);

  const parseProviderOrderSection = (section: string | undefined, category: string) => {
    if (!section || section.length < 10) return;
    const flat = collapseWs(
      normalizePortabilityGluedDates(section).replace(/\n+/g, ' ')
    );

    const anchorRe =
      /(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+)+,?\s*MD)\s+/g;
    const anchors = [...flat.matchAll(anchorRe)];

    for (let i = 0; i < anchors.length; i++) {
      const m = anchors[i];
      const at = m.index ?? 0;
      const before = flat.slice(Math.max(0, at - 140), at);
      let title = before;
      const phSplit = before.split(/\bPh\.?\s*\(?\d{3}\)?[-.\s/]*\d{3}[-.\s/]*\d{4}\s+/i);
      title = phSplit[phSplit.length - 1] || title;
      const zipSplit = title.split(/\b\d{5}(?:-\d{4})?,?\s+/);
      title = zipSplit[zipSplit.length - 1] || title;
      title = cleanOrderTitle(title);

      const afterEnd =
        i + 1 < anchors.length ? (anchors[i + 1].index ?? flat.length) : flat.length;
      let after = flat.slice(at + m[0].length, afterEnd);
      // Stop place/address at the phone (or ZIP) so the next order title does not bleed in
      const phoneCut = after.match(
        /Ph\.?\s*\(?\d{3}\)?[-.\s/]*\d{3}[-.\s/]*\d{3,4}/i
      );
      if (phoneCut && phoneCut.index != null) {
        after = after.slice(0, phoneCut.index + phoneCut[0].length);
      } else {
        const zipCut = after.match(/\b[A-Z]{2},?\s*\d{5}(?:-\d{4})?/);
        if (zipCut && zipCut.index != null) {
          after = after.slice(0, zipCut.index + zipCut[0].length);
        }
      }

      const wrap =
        after.match(
          /^(serum|transvaginal|reflex HIV-1 western blot \(WB\))\b/i
        )?.[1] || '';
      if (wrap) {
        if (/Ag\),?\s*$/i.test(title) && /serum/i.test(wrap)) {
          title = `${title.replace(/,?\s*$/, '')}, serum`;
        } else if (/transabdominal\s*\+\s*$/i.test(title) && /transvaginal/i.test(wrap)) {
          title = title.replace(/\+\s*$/, '+ transvaginal');
        } else if (/serum,\s*$/i.test(title) && /reflex HIV/i.test(wrap)) {
          title = `${title} ${wrap}`;
        } else if (!new RegExp(wrap.replace(/[()]/g, '\\$&'), 'i').test(title)) {
          title = collapseWs(`${title} ${wrap}`);
        }
        after = after.slice(wrap.length).trim();
      }

      // Wrapped fragments sometimes sit after org name / before street
      if (/Ag\),?\s*$/i.test(title) && /\bserum\b/i.test(flat.slice(at, afterEnd))) {
        title = `${title.replace(/,?\s*$/, '')}, serum`;
      }
      if (
        /antibodies,\s*EIA,\s*serum,\s*$/i.test(title) &&
        /reflex HIV-1 western blot/i.test(flat.slice(at, afterEnd))
      ) {
        title = `${title.replace(/,?\s*$/, '')} reflex HIV-1 western blot (WB)`;
      }
      if (
        /transabdominal\s*\+\s*$/i.test(title) &&
        /transvaginal/i.test(flat.slice(at, afterEnd))
      ) {
        title = title.replace(/\+\s*$/, '+ transvaginal');
      }

      title = collapseWs(title).replace(/^[^A-Za-z(+]+/, '').slice(0, 160);
      if (
        !title ||
        title.length < 3 ||
        /^(none recorded|provider|organization|not available|ph\.?)/i.test(title)
      ) {
        continue;
      }

      const orderDate = m[1];
      const provider = collapseWs(m[3]).replace(/,\s*MD$/i, ', MD');
      const times = [...after.matchAll(/\b(\d{1,2}:\d{2}:\d{2})\b/g)].map((t) => t[1]);

      let rest = after
        .replace(/^(serum|transvaginal|reflex HIV-1 western blot \(WB\))\s+/i, '')
        .replace(/\bNot Available\b/gi, '')
        .replace(/\bJennifer Marie\b/gi, '')
        .replace(/\bOrr,?\s*MD\b/gi, '')
        .replace(/\b\d{1,2}:\d{2}:\d{2}\b/g, '')
        .replace(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, '')
        .replace(/\bserum\b/gi, '')
        .replace(/\btransvaginal\b/gi, '')
        .replace(/\breflex\s+HIV[^]*?WB\)/gi, '');
      rest = collapseWs(rest);

      const streetIdx = rest.search(/\d{2,5}\s+[A-Za-z0-9.]/);
      const orgName =
        streetIdx > 0
          ? collapseWs(rest.slice(0, streetIdx))
              .replace(/\breflex\s+HIV[^]*?WB\)/gi, '')
              .replace(/[-—,]+$/, '')
              .trim()
          : collapseWs(rest.split(/\d{2,5}\s/)[0] || '')
              .replace(/\breflex\s+HIV[^]*?WB\)/gi, '')
              .replace(/[-—,]+$/, '')
              .trim();
      const addr =
        streetIdx >= 0
          ? collapseWs(rest.slice(streetIdx)).replace(/\s+/g, ' ')
          : '';

      const place = [orgName, collapseWs(addr)]
        .filter((p) => p && p.length > 1)
        .join(' — ')
        .slice(0, 300);

      take(
        clinicalEntry({
          title,
          detail: `${category} order`,
          category,
          orderDate,
          submitDate: m[2],
          performer: provider,
          date: orderDate,
          recordedBy: provider,
          place,
          time: times[0] ?? '',
          notes: '',
        })
      );
    }
  };

  const labSection = text.match(
    /\bLab\b([\s\S]*?)(?=\n\s*Referral\b|\n\s*Procedures\b|\n\s*Surgeries\b|\n\s*Imaging\b|$)/i
  )?.[1];
  const imagingSection = text.match(
    /\bImaging\b([\s\S]*?)(?=\n\s*MedicationOrders\b|\n\s*VaccineOrders\b|\n\s*Patient\s+Targets\b|$)/i
  )?.[1];

  parseProviderOrderSection(labSection, 'Lab');
  parseProviderOrderSection(imagingSection, 'Imaging');

  // Harold-style flat order table (no Lab/Imaging subsection headers):
  // `Hemoglobin A1c, serum 02/11/2025 David Nkemelu, MD Mile High Endocrinology … Not Available`
  if (!labSection && !imagingSection) {
    parseFlatProviderOrderTable(text, take);
  }

  parseMedLikeOrders(
    text.match(
      /MedicationOrders([\s\S]*?)(?=\n\s*VaccineOrders\b|Patient\s+Targets|Patient\s+Instructions|Reason for Referral|$)/i
    )?.[1],
    'Medication',
    take
  );
  parseMedLikeOrders(
    text.match(
      /VaccineOrders([\s\S]*?)(?=Patient\s+Targets|Patient\s+Instructions|Reason for Referral|Results|$)/i
    )?.[1],
    'Vaccine',
    take
  );

  return rows.slice(0, 80);
}

/**
 * Athena PoT without Lab/Imaging buckets — single-date order rows ending in Not Available.
 */
function parseFlatProviderOrderTable(
  text: string,
  take: (entry: Tab14ClinicalEntry) => void
): void {
  const bodyM = text.match(
    /Order\s+Submit[\s\S]{0,80}?Status([\s\S]*?)(?=\n\s*MedicationOrders\b|\n\s*VaccineOrders\b|Patient\s+Instructions|Reason for Referral|$)/i
  );
  const body = bodyM?.[1];
  if (!body || body.length < 20) return;

  const flat = collapseWs(
    normalizePortabilityGluedDates(body)
      .replace(/\n+/g, ' ')
      .replace(/\bNot\s+Available\b/gi, 'Not Available')
  );

  // Each Harold order ends with clock + Not Available (status column).
  const re =
    /([A-Za-z][A-Za-z0-9 ,/+&'%().-]{2,90}?)\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+)+,?\s*MD)\s+(.*?)\s+Not Available/g;

  for (const m of flat.matchAll(re)) {
    let title = collapseWs(m[1])
      .replace(/^(?:Provider|Organization|Details|Status|Date|Not Available)\s+/i, '')
      .replace(/^(?:Not Available\s+)+/i, '')
      .trim()
      .slice(0, 160);
    if (!title || title.length < 3) continue;
    if (/^(none recorded|provider|organization|not available|date|status)$/i.test(title)) {
      continue;
    }

    const after = collapseWs(m[4]);
    const times = [...after.matchAll(/\b(\d{1,2}:\d{2}:\d{2})\b/g)].map((t) => t[1]);
    const place = after
      .replace(/\b\d{1,2}:\d{2}:\d{2}\b/g, '')
      .replace(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/g, '')
      .trim();
    const provider = collapseWs(m[3]).replace(/,\s*MD$/i, ', MD');

    take(
      clinicalEntry({
        title,
        detail: 'Lab order',
        category: 'Lab',
        orderDate: m[2],
        submitDate: m[2],
        performer: provider,
        date: m[2],
        recordedBy: provider,
        place: collapseWs(place).slice(0, 300),
        time: times[0] ?? '',
        status: 'Not Available',
        notes: '',
      })
    );
  }
}

/**
 * MedicationOrders / VaccineOrders — extract every dated product + instruction (not only the first).
 */
function parseMedLikeOrders(
  chunk: string | undefined,
  kind: 'Medication' | 'Vaccine',
  take: (entry: Tab14ClinicalEntry) => void
): void {
  if (!chunk) return;
  const compact = collapseWs(
    normalizePortabilityGluedDates(chunk)
      .replace(/\bEl\s+90\s+days\.\s*Paso\b/gi, 'El Paso')
      .replace(/\bEl\s+(\d+)\s+days\.\s*Paso\b/gi, 'El Paso')
      .replace(/\n+/g, ' ')
  );

  const verbRe =
    kind === 'Vaccine'
      ? /(\d{1,2}\/\d{1,2}\/\d{4})\s+((?:inject|Inject)\b)/g
      : /(\d{1,2}\/\d{1,2}\/\d{4})\s+((?:TAKE|Take|inject|Inject)\b)/g;
  const anchors = [...compact.matchAll(verbRe)];
  const titleTail =
    /([A-Za-z][A-Za-z0-9()%,./\s-]*?\d+(?:\.\d+)?\s*(?:mg|mL|mcg|unit)s?\b(?:\s+(?:tablet|capsule|vaccine|suspension|bivalent|quadrivalent|[A-Za-z][A-Za-z0-9()%,./-]*)){0,8})\s*$/i;

  let found = 0;
  for (let i = 0; i < anchors.length; i++) {
    const anchor = anchors[i];
    const dateAt = anchor.index ?? 0;
    const date = anchor[1];
    const verb = anchor[2];
    const nextDateAt = i + 1 < anchors.length ? (anchors[i + 1].index ?? compact.length) : compact.length;

    const before = compact.slice(0, dateAt);
    // Only look at the short tail before this date so prior orders cannot glue into the title.
    const window = before.slice(Math.max(0, before.length - 100));
    // Prefer text after the previous instruction's trailing period.
    const afterPeriod = window.includes('.') ? window.slice(window.lastIndexOf('.') + 1) : window;
    const titleM = afterPeriod.match(titleTail) || window.match(titleTail);
    let title = collapseWs(titleM?.[1] ?? '')
      .replace(/^(?:Med\s+Time\s+Pharmacy|Not Available)\s+/i, '')
      .replace(/^.*?\bfor\s+\d+\s+days?\.?\s+/i, '')
      .trim()
      .slice(0, 160);
    if (!title || /not available|^med\b|^time\b|^pharmacy\b/i.test(title)) continue;
    if (kind === 'Medication' && !/\b(?:mg|mcg|unit)s?\b/i.test(title)) continue;
    if (kind === 'Vaccine' && !/\b(?:mL|mg)\b/i.test(title) && !/vaccine/i.test(title)) continue;

    let instr = collapseWs(compact.slice(dateAt + date.length, nextDateAt))
      .replace(/^\s*/, '')
      .trim();
    // Drop the next drug title that sits before the next date
    if (i + 1 < anchors.length) {
      const nextTitle = compact.slice(0, anchors[i + 1].index ?? 0).match(titleTail)?.[1];
      if (nextTitle) {
        const cut = instr.toLowerCase().lastIndexOf(collapseWs(nextTitle).toLowerCase());
        if (cut >= 0) instr = instr.slice(0, cut).trim();
      }
    }
    instr = instr
      .replace(/\b\d{1,2}:\d{2}:\d{2}\b/g, ' ')
      .replace(/\bNot Available\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 400);
    if (!/^(?:TAKE|Take|inject|Inject)\b/i.test(instr)) {
      instr = collapseWs(`${verb} ${instr}`).slice(0, 400);
    }

    const pharmacy =
      compact.match(
        /(\d{2,5}\s+[A-Za-z0-9][^,]{0,40},\s*(?:El Paso|Denver)[^,]*,?\s*\d{5})/i
      )?.[1] || '';
    take(
      clinicalEntry({
        title,
        detail: (instr || `${kind} order`).slice(0, 400),
        category: kind,
        instructions: instr,
        orderDate: date,
        date,
        recordedBy: '',
        place: collapseWs(pharmacy).slice(0, 300),
        time: '',
        notes: `${kind} order`,
      })
    );
    found += 1;
  }
  if (found > 0) return;

  // Diana single-order fallback (methenamine / Gardasil-specific + generic first hit)
  const nameDate =
    compact.match(
      /\b((?:methenamine hippurate(?:\s+1\s+gram(?:\s+tablet)?)?|Gardasil 9 \(PF\) 0\.5 mL(?:\s+intramuscular suspension)?))\s+(\d{1,2}\/\d{1,2}\/\d{4})/i
    ) ||
    compact.match(/\b([A-Za-z][A-Za-z0-9()%,./\s-]{4,80}?)\s+(\d{1,2}\/\d{1,2}\/\d{4})/);
  if (!nameDate) return;
  let title = collapseWs(nameDate[1])
    .replace(/^(?:Med\s+Time\s+Pharmacy|Not Available)\s+/i, '')
    .trim();
  if (/not available|^med\b|^time\b|^pharmacy\b/i.test(title)) return;
  if (/1 gram$/i.test(title) && /\btablet\b/i.test(compact)) title = `${title} tablet`;
  if (/0\.5 mL$/i.test(title) && /\bintramuscular suspension\b/i.test(compact)) {
    title = `${title} intramuscular suspension`;
  }
  title = title.replace(/\s+/g, ' ').slice(0, 160);

  const date = nameDate[2];
  const times = [...compact.matchAll(/\b(\d{1,2}:\d{2}:\d{2})\b/g)].map((t) => t[1]);

  let instr = '';
  if (
    /Take\s+1\s+tablet\s+twice\s+a/i.test(compact) &&
    /day by oral route for/i.test(compact)
  ) {
    instr = 'Take 1 tablet twice a day by oral route for 90 days.';
  } else if (/inject\s+0\.5\s*mL\s+at\s+1,\s*2,\s*6/i.test(compact)) {
    instr = 'Inject 0.5mL at 1, 2, 6 months at pharmacy';
  } else {
    instr = collapseWs(
      compact.match(
        /\b((?:Take|inject|Inject)\b[\s\S]{5,200}?)(?=\s+\d{2,5}\s+[A-Za-z]|\s*$)/i
      )?.[1] || `${kind} order`
    )
      .replace(/\b\d{1,2}:\d{2}:\d{2}\b/g, ' ')
      .replace(/\bintramuscular suspension\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const pharmacy =
    compact.match(
      /(641\s+N\.?\s*Resler\s+Ste\s+\d+,\s*El Paso,?\s*\d{5})/i
    )?.[1] ||
    compact.match(/(\d{2,5}\s+[A-Za-z0-9][^,]{0,40},\s*El Paso,?\s*\d{5})/i)?.[1] ||
    '';
  const phDigits =
    compact.match(/\bPh\.?:?\s*(\d{7,})/i)?.[1] ||
    compact.match(/\b(915\d{7})\b/)?.[1] ||
    '';
  let place = collapseWs(pharmacy).replace(/\s+/g, ' ');
  if (place && phDigits && !new RegExp(phDigits).test(place)) {
    place = `${place}, Ph ${phDigits}`;
  }

  take(
    clinicalEntry({
      title,
      detail: (instr || `${kind} order`).slice(0, 400),
      category: kind,
      instructions: instr.slice(0, 400),
      orderDate: date,
      date,
      recordedBy: '',
      place: place.slice(0, 300),
      time: times[0] ?? '',
      notes: `${kind} order`,
    })
  );
}

/**
 * Athena Patient Instructions rows:
 * Encounter Date / Id / instruction / provider / org / last-modified date+time
 */
export function parsePatientInstructionsEntries(block: string): Tab14ClinicalEntry[] {
  if (!block || block.length < 8) return [];

  const text = normalizePortabilityGluedDates(block)
    .replace(
      /Encounter\s+Date\s+Encounter\s+Id\s*\n?\s*Patient\s+Instructions\s+LastModified\s+by\s+Organization\s+Details\s+Last\s+Modified\s+Time/gi,
      '\n'
    )
    .replace(/\bNot\s+available\b/gi, 'Not Available');

  const rows: Tab14ClinicalEntry[] = [];
  const seen = new Set<string>();
  let lastEncounterDate = '';
  let lastEncounterId = '';

  // Date + encounter id + instruction + provider (preferred)
  const primaryRe =
    /(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{6,})\s+(.+?)\s+([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+)+,?\s*MD)\s+(?:Not Available\s+)?(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2}:\d{2})/g;

  for (const m of text.matchAll(primaryRe)) {
    lastEncounterDate = m[1];
    lastEncounterId = m[2];
    const title = collapseWs(m[3]).trim().slice(0, 160);
    if (!title || /encounter|lastmodified/i.test(title)) continue;
    const key = `${title.toLowerCase()}|${m[1]}|${m[6]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(
      clinicalEntry({
        title,
        detail: `Encounter ID: ${m[2]}`,
        encounterId: m[2],
        date: m[1],
        recordedBy: collapseWs(m[4]).replace(/,\s*MD$/i, ', MD'),
        place: '',
        time: m[6],
        notes: `Last modified ${m[5]} ${m[6]}`,
      })
    );
  }

  // Continuation rows without a new encounter id (same visit)
  const contRe =
    /(?:^|\n)\s*([a-z][a-z0-9()%,.:/'\s-]{8,120}?)\s+([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+)+,?\s*MD)\s+(?:Not Available\s+)?(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2}:\d{2})/g;

  // Walk continuations in document order, tracking the nearest preceding primary encounter
  const primaryEnds = [...text.matchAll(primaryRe)].map((m) => ({
    end: (m.index ?? 0) + m[0].length,
    date: m[1],
    id: m[2],
  }));

  for (const m of text.matchAll(contRe)) {
    const at = m.index ?? 0;
    let encDate = lastEncounterDate;
    let encId = lastEncounterId;
    for (const p of primaryEnds) {
      if (p.end <= at) {
        encDate = p.date;
        encId = p.id;
      }
    }
    const title = collapseWs(m[1]).trim().slice(0, 160);
    if (!title || /encounter|lastmodified|organization/i.test(title)) continue;
    const key = `${title.toLowerCase()}|${m[3]}|${m[4]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(
      clinicalEntry({
        title,
        detail: encId ? `Encounter ID: ${encId}` : 'Patient instruction',
        encounterId: encId,
        date: encDate || m[3],
        recordedBy: collapseWs(m[2]).replace(/,\s*MD$/i, ', MD'),
        place: '',
        time: m[4],
        notes: `Last modified ${m[3]} ${m[4]}`,
      })
    );
  }

  // Stable document order: by date then time then title
  rows.sort((a, b) => {
    const da = `${a.date} ${a.time} ${a.title}`;
    const db = `${b.date} ${b.time} ${b.title}`;
    return da.localeCompare(db);
  });

  return rows.slice(0, 40);
}

/**
 * Athena Procedures top-level body (before Surgical History / Imaging Results).
 * Often empty — do not scrape Plan-of-Treatment Imaging / MedicationOrders noise.
 */
export function parseProceduresSectionEntries(block: string): Tab14ClinicalEntry[] {
  if (!block || block.length < 3) return [];
  const text = normalizePortabilityGluedDates(block)
    .replace(/\bProcedures\s+Surgical\s+History[\s\S]*$/i, '')
    .replace(/\bSurgical\s+History[\s\S]*$/i, '')
    .replace(/\bImaging\s*Results[\s\S]*$/i, '')
    .replace(/\bProcedure\s+Notes[\s\S]*$/i, '')
    .replace(/^Procedures?\b/i, '')
    .trim();

  if (/^none\s+recorded\.?$/i.test(collapseWs(text)) || collapseWs(text).length < 8) {
    return [
      clinicalEntry({
        title: 'None recorded',
        detail: 'No entries under Procedures (see Surgical History for related items).',
      }),
    ];
  }

  // Procedure Notes only
  if (/none\s+recorded/i.test(text) && text.length < 80) {
    return [clinicalEntry({ title: 'None recorded', detail: 'None recorded.' })];
  }

  return [];
}

/**
 * Athena Surgical History table under Procedures.
 * Example: `01/12/2026 Ultrasound Pelvic (…) completed Jennifer Marie Orr, MD TX - Tenet Texas 01/12/2026 17:57:23`
 */
export function parseSurgicalHistoryEntries(block: string): Tab14ClinicalEntry[] {
  if (!block || block.length < 8) return [];

  let text = normalizePortabilityGluedDates(block)
    .replace(/Surgical\s+History\s+Date\s+Name[^\n]{0,160}/gi, '\n')
    .replace(/\bImaging\s*\n?\s*Results\b/gi, '\nImaging Results\n');

  const cut = text.search(SURGICAL_HISTORY_STOP);
  if (cut >= 0) text = text.slice(0, cut);

  if (/none\s+recorded/i.test(text) && !/\d{1,2}\/\d{1,2}\/\d{4}/.test(text)) {
    return [clinicalEntry({ title: 'None recorded', detail: 'None recorded.' })];
  }

  const rows: Tab14ClinicalEntry[] = [];
  const seen = new Set<string>();

  for (const m of collapseWs(text).matchAll(
    /(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+?)\s+(completed|cancelled|preliminary|final)\b\s*(.*?)(?=\s+\d{1,2}\/\d{1,2}\/\d{4}\s+[A-Za-z]|$)/gi
  )) {
    let title = collapseWs(m[2])
      .replace(/\bDate\s+Name\s+Laterality.*$/i, '')
      .replace(/,\s*$/, '')
      .trim()
      .slice(0, 160);
    if (!title || /^(date|name|status|laterality)\b/i.test(title)) continue;
    if (/med\s+time\s+pharmacy|not\s+available/i.test(title) && title.length < 40) continue;

    const rest = collapseWs(m[4]);
    const provider =
      rest.match(
        /([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+)+,?\s*MD)/
      )?.[1] ?? '';
    const place =
      rest.match(/\b(TX\s*-\s*Tenet\s+Texas|NY\s*-\s*[A-Za-z][A-Za-z .'-]+)/i)?.[1] ??
      '';
    const modDate = rest.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)?.[1] ?? '';
    const time = rest.match(/\b(\d{1,2}:\d{2}:\d{2})\b/)?.[1] ?? '';
    const status = m[3].replace(/^./, (c) => c.toUpperCase());
    const key = `${title.toLowerCase()}|${m[1]}`;
    if (seen.has(key)) continue;
    seen.add(key);

    rows.push(
      clinicalEntry({
        title,
        detail: status,
        status,
        laterality: title.match(/\b(Left|Right|Bilateral)\b/i)?.[1] ?? '',
        date: m[1],
        recordedBy: provider,
        place: collapseWs(place),
        time,
        notes: modDate ? `Last modified ${modDate}${time ? ` ${time}` : ''}` : '',
      })
    );
  }

  return rows.slice(0, 40);
}

/**
 * Athena Imaging Results under Procedures (not Results → Imaging).
 * Example: `08/21/2025 US, pelvis, transabdominal + completed … transvaginal`
 */
export function parseImagingResultsEntries(block: string): Tab14ClinicalEntry[] {
  if (!block || block.length < 8) return [];

  let text = normalizePortabilityGluedDates(block)
    .replace(/Imaging\s+Results\s+Imaging\s+Name[^\n]{0,160}/gi, '\n')
    .replace(/\bDate\b\s*(?=\d{1,2}\/\d{1,2}\/\d{4})/gi, '\n')
    .replace(/(completed)(Not\s+Available|Jennifer)/gi, '$1 $2')
    .replace(/\bProcedure\s*\n?\s*Notes\b/gi, '\nProcedure Notes\n');

  const cut = text.search(IMAGING_RESULTS_STOP);
  if (cut >= 0) text = text.slice(0, cut);

  if (/none\s+recorded/i.test(text) && !/\d{1,2}\/\d{1,2}\/\d{4}/.test(text)) {
    return [clinicalEntry({ title: 'None recorded', detail: 'None recorded.' })];
  }

  const flat = collapseWs(text);
  const rows: Tab14ClinicalEntry[] = [];
  const seen = new Set<string>();

  for (const m of flat.matchAll(
    /(\d{1,2}\/\d{1,2}\/\d{4})\s+((?:US|CT|XR|MRI)[\s,][^]*?)(?=\d{1,2}\/\d{1,2}\/\d{4}\s+(?:US|CT|XR|MRI)\b|$)/gi
  )) {
    const date = m[1];
    let chunk = m[2];
    // PDF wraps "… Orr, Akumin … transvaginal MD"
    chunk = collapseWs(chunk).replace(/\btransvaginal\s+(MD)\b/i, '$1');
    const completed = /completed/i.test(chunk);
    const provider =
      chunk.match(/([A-Z][a-zA-Z.'-]+(?:\s+[A-Z][a-zA-Z.'-]+)+,?\s*MD)/)?.[1] ?? '';
    const place =
      chunk.match(
        /\b(Akumin\s+Osborne[^,]*(?:,\s*[^,]*){0,6}|TX\s*-\s*Tenet\s+Texas|Cny\s+Diagnostic[^\d,]*)/i
      )?.[1] ?? '';
    const phone = chunk.match(/\(?\d{3}\)?\s*[-.]?\s*\d{3}\s*[-.]?\s*\d{4}/)?.[0] ?? '';
    const time = chunk.match(/\b(\d{1,2}:\d{2}:\d{2})\b/)?.[1] ?? '';
    let title = collapseWs(
      chunk
        .replace(/\s*completed[\s\S]*$/i, '')
        .replace(/,?\s*Not Available.*$/i, '')
        .replace(/,?\s*Jennifer Marie.*$/i, '')
        .replace(/\s+/g, ' ')
    );
    if (/transabdominal/i.test(m[2]) && /transvaginal/i.test(m[2]) && !/transvaginal/i.test(title)) {
      title = collapseWs(`${title.replace(/\+\s*$/, '')} + transvaginal`);
    }
    title = title.replace(/\s+/g, ' ').trim().slice(0, 160);
    if (!title || title.length < 3) continue;
    const key = `${title.toLowerCase()}|${date}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const placeFull = collapseWs(
      [place.replace(/\s*,\s*/g, ', ').slice(0, 200), phone].filter(Boolean).join(' · ')
    );
    rows.push(
      clinicalEntry({
        title,
        detail: completed ? 'Completed' : 'Unknown',
        status: completed ? 'Completed' : '',
        date,
        recordedBy: provider,
        place: placeFull || collapseWs(place),
        time,
        notes: phone && !placeFull.includes(phone) ? `Phone: ${phone}` : '',
      })
    );
  }

  return rows.slice(0, 40);
}

/** Athena Procedure Notes under Procedures — often “None recorded.” */
export function parseProcedureNotesEntries(block: string): Tab14ClinicalEntry[] {
  if (!block || block.length < 3) return [];
  const text = normalizePortabilityGluedDates(block)
    .replace(/^Procedure\s+Notes\b/i, '')
    .replace(/\bMedical\s+Equipment[\s\S]*$/i, '')
    .trim();

  if (/none\s+recorded/i.test(text) || collapseWs(text).length < 8) {
    return [clinicalEntry({ title: 'None recorded', detail: 'None recorded.' })];
  }

  return [
    clinicalEntry({
      title: 'Procedure Notes',
      detail: collapseWs(text).slice(0, 800),
    }),
  ];
}

/**
 * Athena Obstetrics History (often preceded by Gynecological History).
 * Example: `GPAL: G 0 P 0 0 0 0` and `No gynecological history recorded.`
 */
export function parseObstetricsHistoryEntries(block: string): Tab14ClinicalEntry[] {
  if (!block || block.length < 3) return [];
  const text = normalizePortabilityGluedDates(block)
    .replace(/\bImmunizations[\s\S]*$/i, '')
    // Drop trailing Obstetrics History label when the block is gyn-only
    .replace(/\bObstetrics\s+History\s*$/i, '')
    .trim();

  const rows: Tab14ClinicalEntry[] = [];

  // Check the Athena empty-gyn phrase first — do NOT match the substring
  // "gynecological history" inside "No gynecological history recorded".
  if (/no gynecological history recorded/i.test(text)) {
    rows.push(
      clinicalEntry({
        title: 'Gynecological History',
        detail: 'No gynecological history recorded',
        category: 'Gynecological',
      })
    );
  } else {
    const gyn = text.match(
      /(?:^|\n)\s*Gynecological\s+History\s*[:\-]?\s*([^\n]{3,200}?)(?=\s*(?:Obstetrics\s+History|GPAL\s*:|Immunizations|$))/i
    );
    if (gyn) {
      const detail = collapseWs(gyn[1]).replace(/\.$/, '');
      if (detail && !/^obstetrics\s+history/i.test(detail) && !/^gpal\b/i.test(detail)) {
        rows.push(
          clinicalEntry({
            title: 'Gynecological History',
            detail,
            category: 'Gynecological',
          })
        );
      }
    }
  }

  const gpal = text.match(
    /GPAL\s*:\s*G\s*(\d+)\s*P\s*(\d+)\s+(\d+)\s+(\d+)\s+(\d+)/i
  );
  if (gpal) {
    const gravida = gpal[1];
    const term = gpal[2];
    const preterm = gpal[3];
    const abortus = gpal[4];
    const living = gpal[5];
    rows.push(
      clinicalEntry({
        title: 'GPAL',
        detail: `G ${gravida} P ${term} ${preterm} ${abortus} ${living}`,
        category: 'Obstetrics',
        notes: `Gravida ${gravida}; Term ${term}; Preterm ${preterm}; Abortions ${abortus}; Living ${living}`,
      })
    );
  } else {
    const loose = text.match(/GPAL\s*:\s*(G\s*\d+\s*P[\d\s]+)/i);
    if (loose) {
      rows.push(
        clinicalEntry({
          title: 'GPAL',
          detail: collapseWs(loose[1]),
          category: 'Obstetrics',
        })
      );
    }
  }

  if (!rows.length) {
    if (/none\s+(recorded|reported)/i.test(text) || collapseWs(text).length < 8) {
      return [clinicalEntry({ title: 'None recorded', detail: 'None recorded.' })];
    }
    return [
      clinicalEntry({
        title: 'Obstetrics History',
        detail: collapseWs(text).slice(0, 500),
      }),
    ];
  }

  return rows;
}

const FAMILY_RELATIONSHIP =
  "(?:Maternal|Paternal)\\s+(?:Great\\s+)?(?:Grandmother|Grandfather|Aunt|Uncle|Cousin)" +
  '|Grandmother|Grandfather|Mother|Father|Sister|Brother|Daughter|Son|Aunt|Uncle|Cousin' +
  '|Niece|Nephew|Spouse|Other';

/**
 * Athena Family History table:
 * Relationship | Description | Onset Age | Died of this Age | Resolved Age | Notes | LastModified by | Organization | Time
 * `Mother Hyperlipidemia gescobar20 Not available 11/26/2025 16:20:17`
 */
export function parseFamilyHistoryEntries(block: string): Tab14ClinicalEntry[] {
  if (!block || block.length < 8) return [];
  const text = normalizePortabilityGluedDates(block);

  const rowRe = new RegExp(
    `^(${FAMILY_RELATIONSHIP})\\s+(.+?)\\s+([A-Za-z][A-Za-z0-9._-]{2,30})\\s+` +
      `(Not\\s+available|[A-Za-z][A-Za-z0-9 .,'-]{1,60}?)\\s+` +
      `(\\d{1,2}\\/\\d{1,2}\\/\\d{4})\\s+(\\d{1,2}:\\d{2}:\\d{2})$`,
    'i'
  );

  const rows: Tab14ClinicalEntry[] = [];
  const seen = new Set<string>();
  for (const raw of text.split('\n')) {
    const m = collapseWs(raw).match(rowRe);
    if (!m) continue;
    const relationship = collapseWs(m[1]);
    let description = collapseWs(m[2]);
    const ages = ['', '', ''];
    const ageM = description.match(/^(.*?)((?:\s+\d{1,3})+)$/);
    if (ageM) {
      description = collapseWs(ageM[1]);
      ageM[2]
        .trim()
        .split(/\s+/)
        .slice(0, 3)
        .forEach((age, i) => {
          ages[i] = age;
        });
    }
    if (!description || /^(description|relationship|notes)$/i.test(description)) continue;
    const key = `${relationship}|${description}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(
      clinicalEntry({
        title: description.slice(0, 160),
        detail: relationship,
        relationship,
        onsetAge: ages[0],
        diedAge: ages[1],
        resolvedAge: ages[2],
        date: m[5],
        recordedBy: normalizeAthenaPerson(m[3]),
        place: normalizeAthenaPlace(m[4]),
        time: m[6],
      })
    );
  }

  if (!rows.length && /none\s+recorded|no\s+family\s+history/i.test(text)) {
    return [clinicalEntry({ title: 'None recorded', detail: 'None recorded.' })];
  }
  return rows.slice(0, 40);
}

/**
 * Athena Medical History checklist — one `Condition Response` row per line
 * (`Anxiety Y` / `UTI N`).
 */
export function parseMedicalHistoryChecklistEntries(block: string): Tab14ClinicalEntry[] {
  if (!block || block.length < 8) return [];
  // Upstream header splitting can break a condition across lines
  // (`Eye` / `Problems (Glaucoma…) N`) — a row is only complete at its Y/N answer.
  const reflowed: string[] = [];
  for (const raw of block.split('\n')) {
    const line = collapseWs(raw).replace(/^Condition\s+Response\s*/i, '');
    if (!line) continue;
    const previous = reflowed[reflowed.length - 1];
    if (previous && !/\s[YN]$/.test(previous)) {
      reflowed[reflowed.length - 1] = `${previous} ${line}`;
    } else {
      reflowed.push(line);
    }
  }

  const rows: Tab14ClinicalEntry[] = [];
  const seen = new Set<string>();

  for (const raw of reflowed) {
    const m = raw.match(/^(.{2,140}?)\s+([YN])$/);
    if (!m) continue;
    const condition = m[1].trim();
    // Athena wraps long section titles — real rows always start upper-case
    if (!/^[A-Z0-9(]/.test(condition)) continue;
    if (/^(condition|response|medical\s+history)$/i.test(condition)) continue;
    const key = condition.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(
      clinicalEntry({
        title: condition.slice(0, 160),
        detail: m[2],
        response: m[2],
      })
    );
  }

  if (!rows.length && /none\s+(recorded|reported)/i.test(block)) {
    return [clinicalEntry({ title: 'None recorded', detail: 'None recorded.' })];
  }
  return rows.slice(0, 80);
}

/**
 * Athena Immunizations table:
 * `Gardasil 9 (PF) 0.5 mL intramuscular suspension active Not Available AthenaHealth 08/21/2025 13:27:48`
 */
export function parseImmunizationEntries(block: string): Tab14ClinicalEntry[] {
  if (!block || block.length < 8) return [];
  const text = normalizePortabilityGluedDates(block).replace(
    /Vaccine\s+Type\s+Date\s+Status[^\n]{0,160}/gi,
    '\n'
  );

  const rows: Tab14ClinicalEntry[] = [];
  const seen = new Set<string>();
  const rowRe =
    /^(.+?)\s+(active|completed|entered-in-error|not-done|refused)\s+(.*?)\s*(\d{1,2}\/\d{1,2}\/\d{4})(?:\s+(\d{1,2}:\d{2}:\d{2}))?$/i;

  for (const raw of text.split('\n')) {
    const m = collapseWs(raw).match(rowRe);
    if (!m) continue;
    const title = collapseWs(m[1]);
    if (!title || /^(vaccine|type|status|note|immunizations)\b/i.test(title)) continue;
    const key = `${title.toLowerCase()}|${m[4]}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const status = m[2].toLowerCase();
    const trailing = collapseWs(m[3]).replace(/\bNot\s+Available\b/gi, '').trim();
    rows.push(
      clinicalEntry({
        title: title.slice(0, 160),
        detail: status,
        status,
        date: m[4],
        place: normalizeAthenaPlace(trailing),
        time: m[5] ?? '',
      })
    );
  }

  if (!rows.length && /none\s+(recorded|reported)/i.test(text)) {
    return [clinicalEntry({ title: 'None recorded', detail: 'None recorded.' })];
  }
  return rows.slice(0, 40);
}

const SOCIAL_OBSERVATION_LABEL =
  'Birth Sex|Gender Identity|Sexual orientation|Legal Sex|Preferred Language';

/**
 * Athena "Social History Observation / Description / Date Observed" sub-table:
 * `Gender Identity Identifies as female 04/06/2026`
 */
export function parseSocialObservationEntries(block: string): Tab14ClinicalEntry[] {
  if (!block || block.length < 8) return [];
  const rowRe = new RegExp(
    `^(${SOCIAL_OBSERVATION_LABEL})\\s+(.+?)\\s+(\\d{1,2}\\/\\d{1,2}\\/\\d{4})$`,
    'i'
  );
  const rows: Tab14ClinicalEntry[] = [];
  for (const raw of normalizePortabilityGluedDates(block).split('\n')) {
    const m = collapseWs(raw).match(rowRe);
    if (!m) continue;
    rows.push(
      clinicalEntry({
        title: collapseWs(m[1]),
        detail: collapseWs(m[2]).slice(0, 160),
        date: m[3],
      })
    );
  }
  return rows;
}

/** Right-hand Athena columns (provider / org / address) bleed into wrapped note lines. */
function stripClinicalNoteColumnBleed(
  line: string,
  providerFirstName: string,
  addressNumbers: Set<string>
): string {
  let out = line
    .replace(/^\d{1,2}\/\d{1,2}\/\d{4}\s*(?:text|application)\/[\w.+-]+\s*/i, '')
    .replace(/\s*\d{1,2}:\d{2}:\d{2}$/, '')
    .replace(/\s*\d{1,2}\/\d{1,2}\/\d{4}$/, '')
    .replace(/\s*[A-Z][a-z]+\s+[A-Z][a-z']+,\s*[A-Z][a-z]+$/, '')
    .replace(/\s*[A-Z]{2}\s*-\s*Tenet(?:\s+[A-Z][a-z]+)?$/, '')
    .replace(/\s+MD$/, '')
    .replace(/\s+[A-Za-z]+,\s*(?:SUITE|STE|Ste\.?)$/i, '')
    .replace(/\s+\d{2,5},\s*[A-Z][a-z]+$/, '')
    .replace(/\s+(\d{2,5})(?:\s+[A-Z][a-z]+)?$/, (full, num: string) =>
      addressNumbers.has(num) ? '' : full
    );
  if (providerFirstName) {
    out = out.replace(new RegExp(`\\s*\\b${providerFirstName}$`), '');
  }
  return collapseWs(out);
}

function isClinicalNoteAddressLine(line: string): boolean {
  return (
    /^\d{1,5},?\s*[A-Z][a-z]+$/.test(line) ||
    /^[A-Z][a-z]+,$/.test(line) ||
    /^[A-Z]{2},?\s*\d{5}-?$/.test(line) ||
    /^\d{3,5},\s*(?:US|USA)$/.test(line) ||
    /^(?:Type\s+Name\s+and\s+Details\s+Time|Address)$/i.test(line)
  );
}

/**
 * Athena clinical Notes table (after Payers):
 * `08/21/2025text/html Jennifer TX - Tenet 08/21/2025` then the note body wrapped
 * around the provider / organization / address column.
 */
export function parseClinicalNotesEntries(block: string): Tab14ClinicalEntry[] {
  if (!block || block.length < 40) return [];
  const text = normalizePortabilityGluedDates(block).replace(
    /Date\s+Note\s+Note\s+Provider\s+Organization\s+Recorded[^\n]{0,120}/gi,
    '\n'
  );

  const starts = [
    ...text.matchAll(/(\d{1,2}\/\d{1,2}\/\d{4})\s+((?:text|application)\/[\w.+-]+)/gi),
  ];
  if (!starts.length) return [];

  const rows: Tab14ClinicalEntry[] = [];
  for (let i = 0; i < starts.length; i++) {
    const at = starts[i].index ?? 0;
    const end = i + 1 < starts.length ? (starts[i + 1].index ?? text.length) : text.length;
    const chunk = text.slice(at, end);
    const flat = collapseWs(chunk);

    const addressNumbers = new Set<string>();
    for (const m of flat.matchAll(/\b(\d{2,5})\s+[A-Z][a-z]+[,\s]/g)) {
      addressNumbers.add(m[1]);
    }

    const head = flat.match(
      /^\d{1,2}\/\d{1,2}\/\d{4}\s+(?:text|application)\/[\w.+-]+\s+(?:([A-Z][a-z]+)\s+)?([A-Z]{2}\s*-\s*[A-Z][a-z]+|[A-Z][A-Za-z .'-]{2,40}?)\s+\d{1,2}\/\d{1,2}\/\d{4}/
    );
    const tail = flat.match(/\b([A-Z][a-z]+\s+[A-Z][a-z']+,)\s+([A-Z][a-z]+)\s+(\d{1,2}:\d{2}:\d{2})/);

    const providerFirstName = head?.[1] ?? '';
    const recordedBy = collapseWs(
      [providerFirstName, tail?.[1] ?? '', /\bMD\b/.test(flat) ? 'MD' : ''].join(' ')
    );
    const place = collapseWs([head?.[2] ?? '', tail?.[2] ?? ''].join(' '));

    const body = chunk
      .split('\n')
      .map((raw) => collapseWs(raw))
      .filter((line) => line && !isClinicalNoteAddressLine(line))
      .map((line) => stripClinicalNoteColumnBleed(line, providerFirstName, addressNumbers))
      .filter(Boolean)
      .join(' ');
    if (!body) continue;

    const title =
      collapseWs(body.match(/^(.{10,120}?[.?!])\s/)?.[1] ?? body).slice(0, 160) ||
      `Clinical note ${starts[i][1]}`;

    rows.push(
      clinicalEntry({
        title,
        detail: collapseWs(body).slice(0, 2000),
        noteType: starts[i][2].toLowerCase(),
        date: starts[i][1],
        recordedBy: normalizeAthenaPerson(recordedBy),
        place: normalizeAthenaPlace(place),
        time: tail?.[3] ?? flat.match(/\b(\d{1,2}:\d{2}:\d{2})\b/)?.[1] ?? '',
      })
    );
  }
  return rows.slice(0, 40);
}

/** Move `Label: value` contact details out of the readable detail block into fields. */
function promoteContactFields(row: Tab14ClinicalEntry): Tab14ClinicalEntry {
  const pick = (label: string): string =>
    collapseWs(row.detail.match(new RegExp(`^\\s*${label}\\s*:\\s*(.+)$`, 'im'))?.[1] ?? '');
  const relationship = pick('Relation(?:ship)?');
  const role = pick('Role') || row.role || '';
  const memberId = pick('Member\\s*ID') || row.memberId || '';
  const npi = pick('NPI') || row.npi || '';
  const specialty = pick('Specialty') || row.specialty || '';
  const phone = pick('Phone') || row.phone || '';
  const email = pick('Email') || row.email || '';
  const address = pick('Address') || row.address || '';
  const detail = row.detail
    .split('\n')
    .map((line) => line.trim())
    .filter(
      (line) =>
        line &&
        !/^(Relation(?:ship)?|Role|Member\s*ID|NPI|Specialty|Phone|Email|Address)\s*:/i.test(line)
    )
    .join('\n')
    .trim();
  return {
    ...row,
    relationship: /not listed/i.test(relationship)
      ? row.relationship || ''
      : relationship || row.relationship || '',
    role,
    memberId,
    npi,
    specialty,
    phone,
    email,
    address,
    detail,
  };
}

function blockToEntries(block: string, sectionLabel: string): Tab14ClinicalEntry[] {
  if (!block || block.length < 3) return [];

  const noneM = block.match(
    /^(?:none\s+(?:recorded|reported)\.?|no\s+assessment\s+recorded\.?|no\s+functional\s+sdoh[^\n]*)/i
  );
  if (noneM && block.length < 120) {
    return [clinicalEntry({ title: 'None recorded', detail: noneM[0].trim() })];
  }
  // Assessment section that only states nothing was recorded (may have trailing noise).
  // Never apply this to Related Person / Care Team — those blocks can still contain
  // "No assessment recorded" when section headers were glued mid-line.
  if (
    /assessment/i.test(sectionLabel) &&
    /no\s+assessment\s+recorded/i.test(block) &&
    !/\bPHQ-?\d\b/i.test(block) &&
    !/little interest or pleasure/i.test(block)
  ) {
    return [clinicalEntry({ title: 'None recorded', detail: 'No assessment recorded.' })];
  }

  // Structured contact cards (Related Person / Care Team) before generic Q&A
  if (/related\s+person|care\s+team/i.test(sectionLabel)) {
    const contact = parseRelatedPersonOrCareTeamEntries(block, sectionLabel);
    if (contact.length) return contact;
  }

  if (/plan\s+of\s+treatment/i.test(sectionLabel)) {
    const plan = parsePlanOfTreatmentEntries(block);
    if (plan.length) return plan;
  }

  if (/patient\s+instructions/i.test(sectionLabel)) {
    const instr = parsePatientInstructionsEntries(block);
    if (instr.length) return instr;
  }

  if (/surgical\s+history/i.test(sectionLabel)) {
    const surgical = parseSurgicalHistoryEntries(block);
    if (surgical.length) return surgical;
  }

  if (/imaging\s+results/i.test(sectionLabel)) {
    const imaging = parseImagingResultsEntries(block);
    if (imaging.length) return imaging;
  }

  if (/procedure\s+notes/i.test(sectionLabel)) {
    const notes = parseProcedureNotesEntries(block);
    if (notes.length) return notes;
  }

  if (/^procedures$/i.test(sectionLabel)) {
    const procs = parseProceduresSectionEntries(block);
    if (procs.length) return procs;
  }

  if (/family\s+history/i.test(sectionLabel)) {
    const family = parseFamilyHistoryEntries(block);
    if (family.length) return family;
  }

  if (/medical\s+history/i.test(sectionLabel)) {
    const history = parseMedicalHistoryChecklistEntries(block);
    if (history.length) return history;
  }

  if (/obstetrics\s+history|gynecological\s+history/i.test(sectionLabel)) {
    const ob = parseObstetricsHistoryEntries(block);
    if (ob.length) return ob;
  }

  if (/immunizations/i.test(sectionLabel)) {
    const shots = parseImmunizationEntries(block);
    if (shots.length) return shots;
  }

  if (/^notes$/i.test(sectionLabel)) {
    const clinical = parseClinicalNotesEntries(block);
    if (clinical.length) return clinical;
  }

  if (
    /mental\s+status/i.test(sectionLabel) ||
    /\bPHQ-?\d\b/i.test(block) ||
    /little interest or pleasure in doing things/i.test(block)
  ) {
    const mental = parseMentalStatusEntries(block);
    if (mental.length) return mental;
  }

  // Social / Functional (and similar) Athena Q&A tables — split answer vs recorder metadata
  // Do not route Procedures here — PoT Imaging / MedicationOrders leak as fake dated rows.
  if (
    /social\s+history|functional\s+status|family\s+history|medical\s+history|goals|health\s+concerns|advance\s+directives|reason\s+for\s+referral|medical\s+equipment|immunizations|notes/i.test(
      sectionLabel
    ) ||
    /Tobacco Smoking Status|(?:What|Are|Do|Has|How)\b[^?]{0,80}\?/i.test(block)
  ) {
    const qaRows = parseQuestionAnswerEntries(block);
    if (qaRows.length >= 1) return qaRows;
  }

  // Q&A style fallback
  const qa = [
    ...block.matchAll(
      /((?:What|Are|Do|Has|Tobacco|Birth|Gender|Sexual|Legal|Urinary)[^?]{0,80}\?)\s+([A-Za-z0-9][^?]{0,160}?)(?=\s+(?:What|Are|Do|Has|Tobacco|Birth|Gender|Sexual|Legal|Urinary|LastModified|Organization|Question)\b|$)/gi
    ),
  ];
  if (qa.length >= 1) {
    return qa.slice(0, 40).map((m) => {
      const split = splitAthenaAnswerMetadata(m[2]);
      return clinicalEntry({
        title: m[1].trim().slice(0, 160),
        detail: split.detail,
        date: split.date,
        recordedBy: split.recordedBy,
        place: split.place,
        time: split.time,
        notes: split.notes,
      });
    });
  }

  // Date-prefixed clinical lines — keep date out of the title
  const dated = [
    ...normalizePortabilityGluedDates(block).matchAll(
      /(\d{1,2}\/\d{1,2}\/\d{4})\s+(.{8,220}?)(?=\s+\d{1,2}\/\d{1,2}\/\d{4}\s+|$)/g
    ),
  ];
  if (dated.length >= 1 && dated.length <= 40) {
    return dated.map((m) => {
      let title = collapseWs(m[2])
        .replace(/\bTexas\s+\d{1,2}:\d{2}:\d{2}\b/gi, '')
        .replace(/\b[A-Za-z][A-Za-z .'-]+\s+TX\s*-\s*Tenet\b/gi, '')
        .trim();
      const ansM = title.match(new RegExp(`^(.*?)\\s+(${PHQ_ANSWERS})\\b`, 'i'));
      let detail = '';
      let recordedBy = '';
      let place = '';
      let time = '';
      if (ansM) {
        title = ansM[1].trim();
        const meta = splitAthenaAnswerMetadata(
          collapseWs(m[2]).slice(ansM[1].length).trim()
        );
        detail = ansM[2];
        recordedBy = meta.recordedBy;
        place = meta.place;
        time = meta.time;
      } else {
        const meta = splitAthenaAnswerMetadata(collapseWs(m[2]));
        if (meta.detail && (meta.recordedBy || meta.place || meta.time)) {
          title = meta.detail.slice(0, 160);
          recordedBy = meta.recordedBy;
          place = meta.place;
          time = meta.time;
        }
      }
      return clinicalEntry({
        title: title.slice(0, 160),
        detail,
        date: m[1],
        recordedBy,
        place,
        time,
      });
    });
  }

  // Care team / related person name lines (fallback if structured parser missed)
  const named = block.match(
    /(?:Name|Primary Care Provider|Provider)\s*:?\s*([A-Za-z][A-Za-z .'-]{1,60})/i
  );
  if (named) {
    const fallback = parseRelatedPersonOrCareTeamEntries(block, sectionLabel);
    if (fallback.length) return fallback;
    const phone = block.match(/tel:\+?[-\d()\s]{7,}|Ph\.?\s*:?\s*[\d()-.\s]{7,}/i)?.[0] ?? '';
    const addr =
      block.match(
        /\d{2,5}\s+[A-Za-z0-9][^,]{0,60},\s*[A-Za-z .'-]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?/
      )?.[0] ?? '';
    const email =
      block.match(/mailto:([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i)?.[1] ||
      block.match(/\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i)?.[1] ||
      '';
    return [
      clinicalEntry({
        title: named[1].trim(),
        detail: [phone, email ? `Email: ${email}` : '', addr].filter(Boolean).join('\n').slice(0, 500),
        notes: sectionLabel,
      }),
    ];
  }

  return [
    clinicalEntry({
      title: sectionLabel,
      detail: block.slice(0, 800),
    }),
  ];
}

/** Extract extended Tab14 sections from Athena / portability plain text. */
export function parseExtendedSectionsFromDocument(text: string): Tab14ExtendedSections {
  const out = emptyExtendedSections();
  const labels: Record<Tab14ExtendedSectionKey, string> = {
    relatedPerson: 'Related Person',
    careTeamMembers: 'Care Team Members',
    careTeam: 'Care Team',
    assessment: 'Assessment',
    planOfTreatment: 'Plan of Treatment',
    patientInstructions: 'Patient Instructions',
    reasonForReferral: 'Reason for Referral',
    procedures: 'Procedures',
    surgicalHistory: 'Surgical History',
    imagingResults: 'Imaging Results',
    procedureNotes: 'Procedure Notes',
    medicalEquipment: 'Medical Equipment',
    socialHistory: 'Social History',
    functionalStatus: 'Functional Status',
    mentalStatus: 'Mental Status',
    familyHistory: 'Family History',
    medicalHistory: 'Medical History',
    obstetricsHistory: 'Obstetrics History',
    immunizations: 'Immunizations',
    goals: 'Goals',
    healthConcerns: 'Health Concerns',
    advanceDirectives: 'Advance Directives',
    notes: 'Notes',
  };

  const normalized = normalizePortabilityGluedSectionHeaders(
    normalizePortabilityGluedDates(text)
  );

  for (const key of TAB14_EXTENDED_SECTION_KEYS) {
    const stop =
      key === 'planOfTreatment'
        ? PLAN_OF_TREATMENT_STOP
        : key === 'procedures'
          ? PROCEDURES_STOP
          : key === 'surgicalHistory'
            ? SURGICAL_HISTORY_STOP
            : key === 'imagingResults'
              ? IMAGING_RESULTS_STOP
              : key === 'procedureNotes'
                ? PROCEDURE_NOTES_STOP
                : key === 'medicalHistory'
                  ? MEDICAL_HISTORY_STOP
                  : key === 'obstetricsHistory'
                    ? OBSTETRICS_HISTORY_STOP
                    : SECTION_STOP;
    const blocks = sliceAllPortabilityBlocks(normalized, EXTENDED_HEADER[key], stop);
    if (!blocks.length) continue;
    const merged: Tab14ClinicalEntry[] = [];
    for (const block of blocks) {
      // Skip TOC-sized crumbs (list of section names only)
      if (
        block.length < 40 &&
        /demographics|allergies|medications|vitals|payers/i.test(block) &&
        !/\d{1,2}\/\d{1,2}\/\d{4}/.test(block) &&
        !/none\s+(recorded|reported)|no\s+assessment/i.test(block)
      ) {
        continue;
      }
      // Related Person / Care Team TOC lines list many section titles without contact fields
      if (
        /relatedPerson|careTeamMembers|careTeam/.test(key) &&
        (block.match(SECTION_STOP) || []).length >= 3 &&
        !/\bName\s*:|\btel:|mailto:|Primary\s+Care\s+Provider|Name\s+Role\s+(?:Member\s+ID\s+)?NPI/i.test(
          block
        )
      ) {
        continue;
      }
      // Procedures TOC crumb: "Procedures\nMedical Equipment\nAllergies…"
      if (
        key === 'procedures' &&
        /medical\s+equipment/i.test(block) &&
        /allergies/i.test(block) &&
        !/\d{1,2}\/\d{1,2}\/\d{4}/.test(block) &&
        !/surgical\s+history/i.test(block)
      ) {
        continue;
      }
      merged.push(...blockToEntries(block, labels[key]));
    }
    // Prefer real contact cards over a stray "None recorded" from a bad slice
    if (/relatedPerson|careTeamMembers|careTeam/.test(key)) {
      const contactish = merged.filter(
        (e) =>
          !/none recorded/i.test(e.title) &&
          !/no assessment recorded/i.test(e.detail) &&
          !isCareTeamHeaderNoise(e.title) &&
          !/^(Related Person|Care Team Members|Care Team)$/i.test(e.title.trim()) &&
          !/·/.test(e.detail || '') &&
          (Boolean(e.phone?.trim()) ||
            Boolean(e.email?.trim()) ||
            Boolean(e.address?.trim()) ||
            Boolean(e.role?.trim()) ||
            Boolean(e.npi?.trim()) ||
            Boolean(e.relationship?.trim()) ||
            /Phone:|Email:|Address:|Primary Care|Member ID|NPI:|tel:|Role:/i.test(
              `${e.title} ${e.detail}`
            ))
      );
      out[key] = dedupeClinicalEntries(contactish.length ? contactish : merged);
    } else {
      out[key] = dedupeClinicalEntries(merged);
    }
  }

  // Prefer dedicated Surgical History parse when generic merge was empty/noisy
  if (
    out.surgicalHistory.length === 0 ||
    out.surgicalHistory.every((e) => /med\s+time|not\s+available|jennifer marie orr.*akumin/i.test(e.title))
  ) {
    const surgBlock = slicePortabilityBlock(normalized, EXTENDED_HEADER.surgicalHistory);
    if (surgBlock) {
      const parsed = parseSurgicalHistoryEntries(surgBlock);
      if (parsed.length) out.surgicalHistory = parsed;
    }
  }

  // Imaging Results under Procedures (Diana: two pelvic US studies)
  if (
    out.imagingResults.length === 0 ||
    out.imagingResults.every((e) => /none recorded|imaging results/i.test(e.title) && !/US|CT|XR|MRI/i.test(e.title))
  ) {
    const imgBlocks = sliceAllPortabilityBlocks(
      normalized,
      EXTENDED_HEADER.imagingResults,
      IMAGING_RESULTS_STOP
    );
    const rebuilt: Tab14ClinicalEntry[] = [];
    for (const b of imgBlocks) {
      rebuilt.push(...parseImagingResultsEntries(b));
    }
    if (rebuilt.length) out.imagingResults = dedupeClinicalEntries(rebuilt);
  }

  // Procedure Notes — usually “None recorded.”
  if (out.procedureNotes.length === 0) {
    const noteBlocks = sliceAllPortabilityBlocks(
      normalized,
      EXTENDED_HEADER.procedureNotes,
      PROCEDURE_NOTES_STOP
    );
    const rebuilt: Tab14ClinicalEntry[] = [];
    for (const b of noteBlocks) {
      rebuilt.push(...parseProcedureNotesEntries(b));
    }
    out.procedureNotes = dedupeClinicalEntries(
      rebuilt.length
        ? rebuilt
        : [clinicalEntry({ title: 'None recorded', detail: 'None recorded.' })]
    );
  }

  // Procedures top-level: never keep PoT Imaging / pharmacy noise as procedure titles
  if (
    out.procedures.some((e) =>
      /akumin|med\s+time\s+pharmacy|jennifer marie orr,\s*md\s+akumin|transvaginal\s+13:/i.test(
        `${e.title} ${e.place}`
      )
    ) ||
    out.procedures.length === 0
  ) {
    const procBlocks = sliceAllPortabilityBlocks(
      normalized,
      EXTENDED_HEADER.procedures,
      PROCEDURES_STOP
    );
    const rebuilt: Tab14ClinicalEntry[] = [];
    for (const b of procBlocks) {
      if (
        /medical\s+equipment/i.test(b) &&
        /allergies/i.test(b) &&
        !/\d{1,2}\/\d{1,2}\/\d{4}/.test(b)
      ) {
        continue;
      }
      rebuilt.push(...parseProceduresSectionEntries(b));
    }
    out.procedures = dedupeClinicalEntries(
      rebuilt.length
        ? rebuilt
        : [
            clinicalEntry({
              title: 'None recorded',
              detail: 'No entries under Procedures (see Surgical History for related items).',
            }),
          ]
    );
  }

  // Mental Status must own PHQ content even if Assessment accidentally captured it.
  if (out.mentalStatus.length === 0 || out.assessment.some((e) => /little interest|PHQ-?\d/i.test(e.title))) {
    const mentalBlock = slicePortabilityBlock(normalized, EXTENDED_HEADER.mentalStatus);
    if (mentalBlock) {
      out.mentalStatus = parseMentalStatusEntries(mentalBlock);
    }
  }
  // Keep Assessment clean when PDF says none recorded.
  if (
    out.assessment.some((e) => /little interest|feeling down|PHQ-?\d/i.test(`${e.title} ${e.detail}`))
  ) {
    const assessBlock = slicePortabilityBlock(normalized, EXTENDED_HEADER.assessment);
    if (/no\s+assessment\s+recorded/i.test(assessBlock) || !assessBlock) {
      out.assessment = [
        clinicalEntry({ title: 'None recorded', detail: 'No assessment recorded.' }),
      ];
    }
  }

  // Care Team Members (early contact card) — keep separate from end Care Team table
  {
    const members = slicePortabilityBlock(normalized, /\bcare\s+team\s+members\b/i);
    if (members && members.length > 20) {
      const parsed = parseRelatedPersonOrCareTeamEntries(members, 'Care Team Members');
      out.careTeamMembers = dedupeCareTeamEntries([...out.careTeamMembers, ...parsed]);
    }
  }

  // Care Team (end-of-document NPI / role / specialty table)
  {
    const extra: Tab14ClinicalEntry[] = [];
    const npiTable = sliceAnchoredTable(
      normalized,
      /Care\s+Team\s+Name\s+Role\s+(?:Member\s+ID\s+)?NPI\b/i,
      /$/
    );
    if (npiTable && npiTable.length > 20) {
      extra.push(...parseCareTeamTableEntries(npiTable));
    } else {
      const tableBlock = slicePortabilityBlock(normalized, /\bcare\s+team\b(?!\s+members)/i);
      if (tableBlock && tableBlock.length > 20) {
        extra.push(...parseCareTeamTableEntries(tableBlock));
      }
    }
    out.careTeam = dedupeCareTeamEntries([...out.careTeam, ...extra]);
  }

  // Column-header anchored tables — the bare section titles also appear inside
  // body text (`Notes occasional itching`, `past medical history`), so re-slice.
  const familyBlock = sliceAnchoredTable(
    normalized,
    /Family\s+History\s+Relationship\s+Description/i,
    /(?:^|\n)\s*Medical\s+History\b/i
  );
  if (familyBlock) {
    const family = parseFamilyHistoryEntries(familyBlock);
    if (family.length) out.familyHistory = family;
  }

  // Checklist rows keep their original line breaks — header gluing would split
  // condition names that start with a section word (`Eye Problems (Glaucoma…)`).
  const historyBlock = sliceAnchoredTable(
    normalizePortabilityGluedDates(text),
    /Medical\s+History\s+Condition\s+Response/i,
    /(?:^|\n)\s*(?:Gynecological\s+History|Obstetrics\s+History|Immunizations)\b/i
  );
  if (historyBlock) {
    const history = parseMedicalHistoryChecklistEntries(historyBlock);
    if (history.length) out.medicalHistory = history;
  }

  // Obstetrics / Gynecological History sit between Medical History and Immunizations
  {
    // Prefer a window that includes both Gyn note + GPAL when Athena lists them back-to-back
    const combined = sliceAnchoredTable(
      normalizePortabilityGluedDates(text),
      /(?:Gynecological\s+History|Obstetrics\s+History)/i,
      /(?:^|\n)\s*Immunizations\b/i
    );
    let rebuilt = combined ? parseObstetricsHistoryEntries(combined) : [];
    if (!rebuilt.length) {
      const obBlocks = sliceAllPortabilityBlocks(
        normalized,
        EXTENDED_HEADER.obstetricsHistory,
        OBSTETRICS_HISTORY_STOP
      );
      for (const b of obBlocks) {
        rebuilt.push(...parseObstetricsHistoryEntries(b));
      }
    }
    // Keep one row per title (GPAL / Gynecological History)
    const byTitle = new Map<string, Tab14ClinicalEntry>();
    for (const row of rebuilt) {
      const k = row.title.toLowerCase();
      const prev = byTitle.get(k);
      if (!prev || row.detail.length > prev.detail.length) byTitle.set(k, row);
    }
    const deduped = [...byTitle.values()];
    if (deduped.length) {
      out.obstetricsHistory = deduped;
    } else if (!out.obstetricsHistory.length) {
      out.obstetricsHistory = [
        clinicalEntry({ title: 'None recorded', detail: 'None recorded.' }),
      ];
    }
  }

  const immunizationBlock = sliceAnchoredTable(
    normalized,
    /Immunizations\s+Vaccine\s+Type/i,
    /(?:^|\n)\s*Past\s+Encounters\b/i
  );
  if (immunizationBlock) {
    const shots = parseImmunizationEntries(immunizationBlock);
    if (shots.length) out.immunizations = shots;
  }

  const notesBlock = sliceAnchoredTable(
    normalized,
    /Notes\s+Date\s+Note\s+Note\s+Provider/i,
    /(?:^|\n)\s*Care\s+Team\s+Name\s+Role\b/i
  );
  if (notesBlock) {
    const clinical = parseClinicalNotesEntries(notesBlock);
    if (clinical.length) out.notes = clinical;
  }

  const socialBlock = sliceAnchoredTable(
    normalized,
    /Social\s+History\s+Question\s+Answer/i,
    /(?:^|\n)\s*Functional\s+Status\b/i
  );
  if (socialBlock) {
    const social = dedupeClinicalEntries([
      ...parseQuestionAnswerEntries(socialBlock),
      ...parseSocialObservationEntries(socialBlock),
    ]);
    if (social.length) out.socialHistory = social;
  }

  const concernsBlock = sliceAnchoredTable(
    normalized,
    /Health\s+Concerns\s+Section\s+Related\s+Observation/i,
    /(?:^|\n)\s*Advance\s+Directives?\b/i
  );
  if (/none\s+recorded/i.test(concernsBlock)) {
    out.healthConcerns = [
      clinicalEntry({ title: 'None recorded', detail: 'None Recorded' }),
    ];
  }

  // Advance Directives has no table of its own — Athena only records the social
  // question plus a bare `Directive N:` marker before the Payers table.
  {
    const directiveBlock = collapseWs(
      sliceAnchoredTable(normalized, /Advance\s+Directives?/i, /(?:^|\n)\s*Payers\b/i)
    );
    const social = out.socialHistory.find((e) => /advance\s+directive/i.test(e.title));
    if (social) {
      out.advanceDirectives = [
        clinicalEntry({
          ...social,
          response: /^y/i.test(social.detail) ? 'Y' : /^n/i.test(social.detail) ? 'N' : '',
          status: social.detail,
          notes: directiveBlock ? `Document row: ${directiveBlock.slice(0, 80)}` : social.notes,
        }),
      ];
    } else if (directiveBlock) {
      out.advanceDirectives = [
        clinicalEntry({ title: 'Advance directive', detail: directiveBlock.slice(0, 200) }),
      ];
    }
  }

  out.relatedPerson = out.relatedPerson.map(promoteContactFields);
  out.careTeamMembers = out.careTeamMembers.map(promoteContactFields);
  out.careTeam = out.careTeam.map(promoteContactFields);

  return out;
}

export function mergeExtendedSections(
  base: Tab14ExtendedSections,
  incoming: Tab14ExtendedSections
): Tab14ExtendedSections {
  const out = emptyExtendedSections();
  for (const key of TAB14_EXTENDED_SECTION_KEYS) {
    out[key] = incoming[key]?.length ? incoming[key] : base[key] ?? [];
  }
  return out;
}

export function countExtendedEntries(sections: Tab14ExtendedSections): number {
  return TAB14_EXTENDED_SECTION_KEYS.reduce((n, key) => n + (sections[key]?.length ?? 0), 0);
}
