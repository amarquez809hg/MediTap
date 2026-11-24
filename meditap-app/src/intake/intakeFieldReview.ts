/**
 * Session review gate for PDF/OCR-imported fields (demographics + indexed clinical rows).
 */

import type {
  Tab14AllergyFieldKey,
  Tab14AllergyRowWarnings,
  Tab14ChronicConditionWarnings,
  Tab14ChronicFieldKey,
  Tab14HospitalFieldKey,
  Tab14HospitalFieldWarnings,
  Tab14IndexedRowWarnings,
  Tab14InsuranceFieldKey,
  Tab14InsuranceRowWarnings,
  Tab14MedicationFieldKey,
  Tab14MedicationRowWarnings,
  Tab14PatientFieldKey,
  Tab14PatientFieldWarnings,
} from './tab14IntakeTypes';

export type FieldReviewDecision = 'accepted' | 'rejected';

export type FieldReviewState = Partial<
  Record<Tab14PatientFieldKey, FieldReviewDecision>
>;

export type IndexedReviewKey = `${number}:${string}`;
export type IndexedFieldReviewState = Partial<
  Record<IndexedReviewKey, FieldReviewDecision>
>;

export type ReviewGateResult = {
  unresolvedCount: number;
  unresolvedKeys: Tab14PatientFieldKey[];
  unresolvedIndexedCount: number;
  canSave: boolean;
};

export function indexedReviewKey(index: number, field: string): IndexedReviewKey {
  return `${index}:${field}`;
}

/** Keys that still have warnings and have not been accepted/rejected. */
export function listUnresolvedPatientWarnings(
  warnings: Tab14PatientFieldWarnings | undefined,
  decisions: FieldReviewState
): Tab14PatientFieldKey[] {
  if (!warnings) return [];
  return (Object.keys(warnings) as Tab14PatientFieldKey[]).filter(
    (key) => warnings[key] && !decisions[key]
  );
}

export function countUnresolvedIndexedWarnings<K extends string>(
  warnings: Tab14IndexedRowWarnings<K> | undefined,
  decisions: IndexedFieldReviewState
): number {
  if (!warnings) return 0;
  let n = 0;
  for (const [indexStr, row] of Object.entries(warnings)) {
    if (!row) continue;
    const index = Number(indexStr);
    for (const field of Object.keys(row) as K[]) {
      if (!row[field]) continue;
      if (!decisions[indexedReviewKey(index, String(field))]) n += 1;
    }
  }
  return n;
}

export function countUnresolvedHospitalWarnings(
  warnings: Tab14HospitalFieldWarnings | undefined,
  decisions: IndexedFieldReviewState
): number {
  if (!warnings) return 0;
  let n = 0;
  for (const field of Object.keys(warnings) as Tab14HospitalFieldKey[]) {
    if (!warnings[field]) continue;
    if (!decisions[indexedReviewKey(0, `hospital:${field}`)]) n += 1;
  }
  return n;
}

export function evaluatePatientFieldReviewGate(
  warnings: Tab14PatientFieldWarnings | undefined,
  decisions: FieldReviewState,
  indexed?: {
    allergies?: Tab14AllergyRowWarnings;
    medications?: Tab14MedicationRowWarnings;
    chronic?: Tab14ChronicConditionWarnings;
    insurances?: Tab14InsuranceRowWarnings;
    hospital?: Tab14HospitalFieldWarnings;
    decisions?: IndexedFieldReviewState;
  }
): ReviewGateResult {
  const unresolvedKeys = listUnresolvedPatientWarnings(warnings, decisions);
  const indexedDecisions = indexed?.decisions || {};
  const unresolvedIndexedCount =
    countUnresolvedIndexedWarnings(indexed?.allergies, indexedDecisions) +
    countUnresolvedIndexedWarnings(indexed?.medications, indexedDecisions) +
    countUnresolvedIndexedWarnings(indexed?.chronic, indexedDecisions) +
    countUnresolvedIndexedWarnings(indexed?.insurances, indexedDecisions) +
    countUnresolvedHospitalWarnings(indexed?.hospital, indexedDecisions);

  const unresolvedCount = unresolvedKeys.length + unresolvedIndexedCount;
  return {
    unresolvedCount,
    unresolvedKeys,
    unresolvedIndexedCount,
    canSave: unresolvedCount === 0,
  };
}

export function acceptPatientFieldWarning(
  warnings: Tab14PatientFieldWarnings | undefined,
  decisions: FieldReviewState,
  key: Tab14PatientFieldKey
): {
  warnings: Tab14PatientFieldWarnings | undefined;
  decisions: FieldReviewState;
} {
  if (!warnings?.[key]) {
    return { warnings, decisions: { ...decisions, [key]: 'accepted' } };
  }
  const nextWarnings = { ...warnings };
  delete nextWarnings[key];
  return {
    warnings: Object.keys(nextWarnings).length ? nextWarnings : undefined,
    decisions: { ...decisions, [key]: 'accepted' },
  };
}

export function rejectPatientFieldWarning(
  warnings: Tab14PatientFieldWarnings | undefined,
  decisions: FieldReviewState,
  key: Tab14PatientFieldKey
): {
  warnings: Tab14PatientFieldWarnings | undefined;
  decisions: FieldReviewState;
  clearField: true;
} {
  const nextWarnings = warnings ? { ...warnings } : {};
  delete nextWarnings[key];
  return {
    warnings: Object.keys(nextWarnings).length ? nextWarnings : undefined,
    decisions: { ...decisions, [key]: 'rejected' },
    clearField: true,
  };
}

export function acceptIndexedFieldWarning<K extends string>(
  warnings: Tab14IndexedRowWarnings<K> | undefined,
  decisions: IndexedFieldReviewState,
  index: number,
  field: K
): {
  warnings: Tab14IndexedRowWarnings<K> | undefined;
  decisions: IndexedFieldReviewState;
} {
  const key = indexedReviewKey(index, String(field));
  const nextDecisions = { ...decisions, [key]: 'accepted' as const };
  if (!warnings?.[index]?.[field]) {
    return { warnings, decisions: nextDecisions };
  }
  const nextWarnings: Tab14IndexedRowWarnings<K> = { ...warnings };
  const row: Partial<Record<K, import('./tab14IntakeTypes').Tab14FieldWarning>> = {
    ...(nextWarnings[index] || {}),
  };
  delete row[field];
  if (Object.keys(row).length === 0) delete nextWarnings[index];
  else nextWarnings[index] = row;
  return {
    warnings: Object.keys(nextWarnings).length ? nextWarnings : undefined,
    decisions: nextDecisions,
  };
}

export function rejectIndexedFieldWarning<K extends string>(
  warnings: Tab14IndexedRowWarnings<K> | undefined,
  decisions: IndexedFieldReviewState,
  index: number,
  field: K
): {
  warnings: Tab14IndexedRowWarnings<K> | undefined;
  decisions: IndexedFieldReviewState;
  clearField: true;
} {
  const key = indexedReviewKey(index, String(field));
  const nextDecisions = { ...decisions, [key]: 'rejected' as const };
  const nextWarnings: Tab14IndexedRowWarnings<K> = warnings ? { ...warnings } : {};
  if (nextWarnings[index]) {
    const row: Partial<Record<K, import('./tab14IntakeTypes').Tab14FieldWarning>> = {
      ...nextWarnings[index],
    };
    delete row[field];
    if (Object.keys(row).length === 0) delete nextWarnings[index];
    else nextWarnings[index] = row;
  }
  return {
    warnings: Object.keys(nextWarnings).length ? nextWarnings : undefined,
    decisions: nextDecisions,
    clearField: true,
  };
}

export function acceptHospitalFieldWarning(
  warnings: Tab14HospitalFieldWarnings | undefined,
  decisions: IndexedFieldReviewState,
  field: Tab14HospitalFieldKey
): {
  warnings: Tab14HospitalFieldWarnings | undefined;
  decisions: IndexedFieldReviewState;
} {
  const key = indexedReviewKey(0, `hospital:${field}`);
  const nextDecisions = { ...decisions, [key]: 'accepted' as const };
  if (!warnings?.[field]) return { warnings, decisions: nextDecisions };
  const next = { ...warnings };
  delete next[field];
  return {
    warnings: Object.keys(next).length ? next : undefined,
    decisions: nextDecisions,
  };
}

export function rejectHospitalFieldWarning(
  warnings: Tab14HospitalFieldWarnings | undefined,
  decisions: IndexedFieldReviewState,
  field: Tab14HospitalFieldKey
): {
  warnings: Tab14HospitalFieldWarnings | undefined;
  decisions: IndexedFieldReviewState;
  clearField: true;
} {
  const key = indexedReviewKey(0, `hospital:${field}`);
  const nextDecisions = { ...decisions, [key]: 'rejected' as const };
  const next = warnings ? { ...warnings } : {};
  delete next[field];
  return {
    warnings: Object.keys(next).length ? next : undefined,
    decisions: nextDecisions,
    clearField: true,
  };
}

/** Accept every remaining warned demographic + indexed clinical field. */
export function acceptAllPatientFieldWarnings(
  warnings: Tab14PatientFieldWarnings | undefined,
  decisions: FieldReviewState,
  indexed?: {
    allergies?: Tab14AllergyRowWarnings;
    medications?: Tab14MedicationRowWarnings;
    chronic?: Tab14ChronicConditionWarnings;
    insurances?: Tab14InsuranceRowWarnings;
    hospital?: Tab14HospitalFieldWarnings;
    decisions?: IndexedFieldReviewState;
  }
): {
  warnings: undefined;
  decisions: FieldReviewState;
  indexedDecisions: IndexedFieldReviewState;
  allergies: undefined;
  medications: undefined;
  chronic: undefined;
  insurances: undefined;
  hospital: undefined;
} {
  const next: FieldReviewState = { ...decisions };
  if (warnings) {
    for (const key of Object.keys(warnings) as Tab14PatientFieldKey[]) {
      next[key] = 'accepted';
    }
  }
  const indexedDecisions: IndexedFieldReviewState = { ...(indexed?.decisions || {}) };

  const markIndexed = <K extends string>(rows?: Tab14IndexedRowWarnings<K>) => {
    if (!rows) return;
    for (const [indexStr, row] of Object.entries(rows)) {
      if (!row) continue;
      const index = Number(indexStr);
      for (const field of Object.keys(row) as K[]) {
        if (row[field]) {
          indexedDecisions[indexedReviewKey(index, String(field))] = 'accepted';
        }
      }
    }
  };

  markIndexed(indexed?.allergies);
  markIndexed(indexed?.medications);
  markIndexed(indexed?.chronic);
  markIndexed(indexed?.insurances);
  if (indexed?.hospital) {
    for (const field of Object.keys(indexed.hospital) as Tab14HospitalFieldKey[]) {
      if (indexed.hospital[field]) {
        indexedDecisions[indexedReviewKey(0, `hospital:${field}`)] = 'accepted';
      }
    }
  }

  return {
    warnings: undefined,
    decisions: next,
    indexedDecisions,
    allergies: undefined,
    medications: undefined,
    chronic: undefined,
    insurances: undefined,
    hospital: undefined,
  };
}

export type DocumentIdentityMatch = {
  match: boolean;
  reason: 'ok' | 'missing_parsed' | 'missing_chart' | 'mismatch';
  parsedLabel: string;
  chartLabel: string;
};

function normName(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Compare PDF-parsed name to chart patient for vault apply safety. */
export function matchParsedIdentityToChart(input: {
  parsedGiven?: string | null;
  parsedFamily?: string | null;
  chartGiven?: string | null;
  chartFamily?: string | null;
}): DocumentIdentityMatch {
  const parsedGiven = normName(input.parsedGiven || '');
  const parsedFamily = normName(input.parsedFamily || '');
  const chartGiven = normName(input.chartGiven || '');
  const chartFamily = normName(input.chartFamily || '');
  const parsedLabel = [input.parsedGiven, input.parsedFamily]
    .filter(Boolean)
    .join(' ')
    .trim();
  const chartLabel = [input.chartGiven, input.chartFamily]
    .filter(Boolean)
    .join(' ')
    .trim();

  if (!parsedGiven || !parsedFamily) {
    return {
      match: false,
      reason: 'missing_parsed',
      parsedLabel,
      chartLabel,
    };
  }
  if (!chartGiven || !chartFamily) {
    return {
      match: false,
      reason: 'missing_chart',
      parsedLabel,
      chartLabel,
    };
  }
  const match = parsedGiven === chartGiven && parsedFamily === chartFamily;
  return {
    match,
    reason: match ? 'ok' : 'mismatch',
    parsedLabel,
    chartLabel,
  };
}

/** Human labels for demographic keys in the staff review queue. */
const PATIENT_FIELD_QUEUE_LABELS: Partial<Record<Tab14PatientFieldKey, string>> = {
  givenName: 'Given Name',
  familyName: 'Family Name',
  patientFullName: 'Patient Name',
  formerAliases: 'Former / Aliases',
  dateOfBirth: 'Date of Birth',
  bloodType: 'Blood Type',
  email: 'Email',
  additionalEmails: 'Additional emails',
  phoneNumber: 'Phone Number',
  homePhone: 'Home phone',
  communication: 'Communication',
  address: 'Address',
  race: 'Race',
  ethnicity: 'Ethnicity',
  preferredLanguage: 'Preferred Language',
  maritalStatus: 'Marital Status',
  sexAtBirth: 'Sex at Birth',
  legalSex: 'Legal sex',
  genderIdentity: 'Gender identity',
  sexualOrientation: 'Sexual orientation',
  heightInches: 'Height',
  weightLbs: 'Weight',
  systolicBp: 'Systolic BP',
  diastolicBp: 'Diastolic BP',
  heartRate: 'Heart rate',
  bodyMassIndex: 'BMI',
  emergencyContactGivenName: 'Emergency contact given name',
  emergencyContactFamilyName: 'Emergency contact family name',
  emergencyContactRelationship: 'Emergency contact relationship',
  emergencyContactPhone: 'Emergency contact phone',
  emergencyContactEmail: 'Emergency contact email',
  otherNotes: 'Other notes',
};

const ALLERGY_FIELD_LABELS: Partial<Record<Tab14AllergyFieldKey, string>> = {
  allergyName: 'Allergen',
  allergyType: 'Type',
  severity: 'Severity',
  reactionNotes: 'Reaction',
  lastObserved: 'Last observed',
};

const MEDICATION_FIELD_LABELS: Partial<Record<Tab14MedicationFieldKey, string>> = {
  genericName: 'Generic name',
  brandName: 'Brand name',
  dosage: 'Dosage',
  route: 'Route',
  frequency: 'Frequency',
};

const CHRONIC_FIELD_LABELS: Partial<Record<Tab14ChronicFieldKey, string>> = {
  conditionName: 'Condition',
  status: 'Status',
  diagnosisDate: 'Diagnosed',
  icdCode: 'ICD code',
  severity: 'Severity',
  notesChronicConditions: 'Notes',
};

const INSURANCE_FIELD_LABELS: Partial<Record<Tab14InsuranceFieldKey, string>> = {
  providerName: 'Payer / provider',
  planName: 'Plan',
  memberID: 'Member ID',
  groupNumber: 'Group number',
  policyNumber: 'Policy number',
  subscriberName: 'Subscriber',
  relationToSubscriber: 'Relation to subscriber',
};

const HOSPITAL_FIELD_LABELS: Partial<Record<Tab14HospitalFieldKey, string>> = {
  facilityName: 'Facility',
  visitType: 'Visit type',
  visitDate: 'Visit date',
  reason: 'Reason',
  dischargeDate: 'Discharge date',
  attendingPhysician: 'Attending',
  location: 'Location',
  diagnosisNote: 'Diagnosis note',
};

export type IntakeReviewQueueKind =
  | 'patient'
  | 'allergy'
  | 'medication'
  | 'chronic'
  | 'insurance'
  | 'hospital';

export type IntakeFieldConfidence = 'low' | 'medium';

/** Map warning reason → staff-facing confidence for the review queue. */
export function confidenceFromWarningReason(
  reason?: string
): IntakeFieldConfidence {
  if (
    reason === 'ocr_sparse' ||
    reason === 'label_bleed' ||
    reason === 'suspicious_name' ||
    reason === 'contains_other_label'
  ) {
    return 'low';
  }
  return 'medium';
}

/** One flagged field in the staff Accept/Reject worklist. */
export type IntakeReviewQueueItem = {
  id: string;
  kind: IntakeReviewQueueKind;
  /** Tab14 sidebar section key for Jump. */
  sectionKey:
    | 'demographics'
    | 'allergies'
    | 'medications'
    | 'problems'
    | 'payers'
    | 'pastEncounters';
  sectionLabel: string;
  fieldLabel: string;
  /** Row index for clinical repeaters; 0 for demographics/hospital. */
  index: number;
  field: string;
  message: string;
  reason?: string;
  confidence: IntakeFieldConfidence;
  sourceLabel?: string;
  sourcePage?: number;
  currentValue?: string;
};

export type IntakeReviewWarningsBundle = {
  patient?: Tab14PatientFieldWarnings;
  allergies?: Tab14AllergyRowWarnings;
  medications?: Tab14MedicationRowWarnings;
  chronic?: Tab14ChronicConditionWarnings;
  insurances?: Tab14InsuranceRowWarnings;
  hospital?: Tab14HospitalFieldWarnings;
};

function warningProvenanceMessage(
  warning: { message?: string; sourceLabel?: string; sourcePage?: number }
): string {
  const provenance = [
    warning.sourceLabel,
    warning.sourcePage != null ? `page ${warning.sourcePage}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const base = warning.message || 'Verify this value from the uploaded document';
  return provenance ? `${base} (${provenance})` : base;
}

function pushIndexedQueueItems<K extends string>(
  out: IntakeReviewQueueItem[],
  opts: {
    kind: IntakeReviewQueueKind;
    sectionKey: IntakeReviewQueueItem['sectionKey'];
    sectionLabel: string;
    warnings: Tab14IndexedRowWarnings<K> | undefined;
    decisions: IndexedFieldReviewState;
    labels: Partial<Record<K, string>>;
    values?: Array<Partial<Record<K, string>>>;
  }
) {
  if (!opts.warnings) return;
  for (const [indexStr, row] of Object.entries(opts.warnings)) {
    if (!row) continue;
    const index = Number(indexStr);
    for (const field of Object.keys(row) as K[]) {
      const warning = row[field];
      if (!warning) continue;
      if (opts.decisions[indexedReviewKey(index, String(field))]) continue;
      const value = opts.values?.[index]?.[field];
      out.push({
        id: `${opts.kind}:${index}:${String(field)}`,
        kind: opts.kind,
        sectionKey: opts.sectionKey,
        sectionLabel: opts.sectionLabel,
        fieldLabel: opts.labels[field] || String(field),
        index,
        field: String(field),
        message: warningProvenanceMessage(warning),
        reason: warning.reason,
        confidence: confidenceFromWarningReason(warning.reason),
        sourceLabel: warning.sourceLabel,
        sourcePage: warning.sourcePage,
        currentValue: value != null ? String(value) : undefined,
      });
    }
  }
}

/**
 * Flatten unresolved PDF/OCR warnings into a staff worklist (demographics + clinical rows).
 */
export function listIntakeReviewQueueItems(input: {
  patientWarnings?: Tab14PatientFieldWarnings;
  patientDecisions?: FieldReviewState;
  patientValues?: Partial<Record<Tab14PatientFieldKey, string | string[]>>;
  allergies?: Tab14AllergyRowWarnings;
  medications?: Tab14MedicationRowWarnings;
  chronic?: Tab14ChronicConditionWarnings;
  insurances?: Tab14InsuranceRowWarnings;
  hospital?: Tab14HospitalFieldWarnings;
  indexedDecisions?: IndexedFieldReviewState;
  allergyValues?: Array<Partial<Record<Tab14AllergyFieldKey, string>>>;
  medicationValues?: Array<Partial<Record<Tab14MedicationFieldKey, string>>>;
  chronicValues?: Array<Partial<Record<Tab14ChronicFieldKey, string>>>;
  insuranceValues?: Array<Partial<Record<Tab14InsuranceFieldKey, string>>>;
  hospitalValues?: Partial<Record<Tab14HospitalFieldKey, string>>;
}): IntakeReviewQueueItem[] {
  const items: IntakeReviewQueueItem[] = [];
  const patientDecisions = input.patientDecisions || {};
  const indexedDecisions = input.indexedDecisions || {};

  if (input.patientWarnings) {
    for (const key of Object.keys(input.patientWarnings) as Tab14PatientFieldKey[]) {
      const warning = input.patientWarnings[key];
      if (!warning || patientDecisions[key]) continue;
      const raw = input.patientValues?.[key];
      const currentValue = Array.isArray(raw)
        ? raw.filter(Boolean).join('; ')
        : raw != null
          ? String(raw)
          : undefined;
      items.push({
        id: `patient:0:${key}`,
        kind: 'patient',
        sectionKey: 'demographics',
        sectionLabel: 'Patient Information',
        fieldLabel: PATIENT_FIELD_QUEUE_LABELS[key] || key,
        index: 0,
        field: key,
        message: warningProvenanceMessage(warning),
        reason: warning.reason,
        confidence: confidenceFromWarningReason(warning.reason),
        sourceLabel: warning.sourceLabel,
        sourcePage: warning.sourcePage,
        currentValue,
      });
    }
  }

  pushIndexedQueueItems(items, {
    kind: 'allergy',
    sectionKey: 'allergies',
    sectionLabel: 'Allergies',
    warnings: input.allergies,
    decisions: indexedDecisions,
    labels: ALLERGY_FIELD_LABELS,
    values: input.allergyValues,
  });
  pushIndexedQueueItems(items, {
    kind: 'medication',
    sectionKey: 'medications',
    sectionLabel: 'Medications',
    warnings: input.medications,
    decisions: indexedDecisions,
    labels: MEDICATION_FIELD_LABELS,
    values: input.medicationValues,
  });
  pushIndexedQueueItems(items, {
    kind: 'chronic',
    sectionKey: 'problems',
    sectionLabel: 'Problems',
    warnings: input.chronic,
    decisions: indexedDecisions,
    labels: CHRONIC_FIELD_LABELS,
    values: input.chronicValues,
  });
  pushIndexedQueueItems(items, {
    kind: 'insurance',
    sectionKey: 'payers',
    sectionLabel: 'Insurance / Payers',
    warnings: input.insurances,
    decisions: indexedDecisions,
    labels: INSURANCE_FIELD_LABELS,
    values: input.insuranceValues,
  });

  if (input.hospital) {
    for (const field of Object.keys(input.hospital) as Tab14HospitalFieldKey[]) {
      const warning = input.hospital[field];
      if (!warning) continue;
      if (indexedDecisions[indexedReviewKey(0, `hospital:${field}`)]) continue;
      items.push({
        id: `hospital:0:${field}`,
        kind: 'hospital',
        sectionKey: 'pastEncounters',
        sectionLabel: 'Past Encounters',
        fieldLabel: HOSPITAL_FIELD_LABELS[field] || field,
        index: 0,
        field,
        message: warningProvenanceMessage(warning),
        reason: warning.reason,
        confidence: confidenceFromWarningReason(warning.reason),
        sourceLabel: warning.sourceLabel,
        sourcePage: warning.sourcePage,
        currentValue: input.hospitalValues?.[field],
      });
    }
  }

  const rank = (c: IntakeFieldConfidence) => (c === 'low' ? 0 : 1);
  return items.sort((a, b) => rank(a.confidence) - rank(b.confidence));
}

/** Persistable warning bundle for vault parse_snapshot (admin queue counts). */
export function buildReviewWarningsBundle(
  input: IntakeReviewWarningsBundle
): IntakeReviewWarningsBundle | undefined {
  const out: IntakeReviewWarningsBundle = {};
  if (input.patient && Object.keys(input.patient).length) out.patient = input.patient;
  if (input.allergies && Object.keys(input.allergies).length) {
    out.allergies = input.allergies;
  }
  if (input.medications && Object.keys(input.medications).length) {
    out.medications = input.medications;
  }
  if (input.chronic && Object.keys(input.chronic).length) out.chronic = input.chronic;
  if (input.insurances && Object.keys(input.insurances).length) {
    out.insurances = input.insurances;
  }
  if (input.hospital && Object.keys(input.hospital).length) out.hospital = input.hospital;
  return Object.keys(out).length ? out : undefined;
}

/** Count unresolved flagged fields stored on a vault parse_snapshot. */
export function countReviewWarningsInSnapshot(raw: unknown): number {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 0;
  const snap = raw as Record<string, unknown>;
  const bundle =
    (snap.reviewWarnings as IntakeReviewWarningsBundle | undefined) ||
    (snap.fieldWarnings
      ? { patient: snap.fieldWarnings as Tab14PatientFieldWarnings }
      : undefined);
  if (!bundle) return 0;
  return listIntakeReviewQueueItems({
    patientWarnings: bundle.patient,
    allergies: bundle.allergies,
    medications: bundle.medications,
    chronic: bundle.chronic,
    insurances: bundle.insurances,
    hospital: bundle.hospital,
  }).length;
}

export type {
  Tab14AllergyFieldKey,
  Tab14ChronicFieldKey,
  Tab14InsuranceFieldKey,
  Tab14MedicationFieldKey,
};
