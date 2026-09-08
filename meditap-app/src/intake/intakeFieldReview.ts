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

export type {
  Tab14AllergyFieldKey,
  Tab14ChronicFieldKey,
  Tab14InsuranceFieldKey,
  Tab14MedicationFieldKey,
};
