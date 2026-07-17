/**
 * Heuristics for PDF/OCR label bleed and suspicious demographic values.
 * Normalizes values when safe and returns optional verify warnings.
 */

import {
  collapseWs,
  DEMOGRAPHIC_LABELS,
  type DemographicFieldKey,
} from './intakeFieldLabels';
import type {
  Tab14AllergyRow,
  Tab14ChronicConditionWarnings,
  Tab14ChronicFieldKey,
  Tab14ChronicRow,
  Tab14FieldWarning,
  Tab14HospitalFields,
  Tab14HospitalFieldKey,
  Tab14HospitalFieldWarnings,
  Tab14IndexedRowWarnings,
  Tab14InsuranceRow,
  Tab14MedicationRow,
  Tab14PatientFieldKey,
  Tab14PatientFieldWarnings,
  Tab14PatientFields,
  Tab14IntakeParseResult,
} from './tab14IntakeTypes';

const VERIFY_GENERIC =
  'Verify this value from the uploaded document';

const VERIFY_LABEL_BLEED =
  'Label text may have been included in this value; verify against source document.';

const VERIFY_OTHER_LABEL =
  'This value may include text from a neighboring field; verify against source document.';

const VERIFY_SUSPICIOUS_NAME =
  'This name may have been misread; verify against source document.';

const VERIFY_OCR =
  'Document text was sparse, hard to read, or OCR-assisted; verify this value against the source document.';

const VERIFY_VISIT_NOTE =
  'This may be visit-note text rather than a clinical list entry; verify against the source document.';

/** Leading tokens that often bleed into extracted values (e.g. "name MARIA GARCIA"). */
const LEADING_LABEL_TOKENS: RegExp[] = [
  /^(?:patient\s+)?(?:full\s+)?name\b[:#]?\s+/i,
  /^(?:given|first|family|last|child)\s+name\b[:#]?\s+/i,
  /^(?:nombre(?:\s+completo)?|apellido)\b[:#]?\s+/i,
  /^(?:d\.?o\.?b\.?|date\s+of\s+birth|birth\s+date|born)\b[:#]?\s+/i,
  /^(?:fecha\s+de\s+nacimiento)\b[:#]?\s+/i,
  /^(?:email|e-mail|correo(?:\s+electr[o?]nico)?)\b[:#]?\s+/i,
  /^(?:phone(?:\s+number)?|mobile|cell|tel[e?]fono)\b[:#]?\s+/i,
  /^(?:address|home\s+address|street\s+address|direcci[o?]n)\b[:#]?\s+/i,
  /^(?:sex(?:\s+at\s+birth)?|gender|sexo)\b[:#]?\s+/i,
  /^(?:blood\s+type|tipo\s+de\s+sangre)\b[:#]?\s+/i,
  /^(?:race|raza|ethnicity|etnicidad)\b[:#]?\s+/i,
  /^(?:preferred\s+language|language|idioma(?:\s+preferido)?)\b[:#]?\s+/i,
  /^(?:marital\s+status|estado\s+civil)\b[:#]?\s+/i,
];

const CLINICAL_LEADING_LABELS: RegExp[] = [
  /^(?:allergy|allergies|allergen)\b[:#]?\s+/i,
  /^(?:medication|medications|drug|rx)\b[:#]?\s+/i,
  /^(?:condition|diagnosis|problem|icd)\b[:#]?\s+/i,
  /^(?:insurance|payer|carrier|plan|member\s*id|group)\b[:#]?\s+/i,
  /^(?:facility|hospital|visit|encounter|attending)\b[:#]?\s+/i,
];

const VISIT_NOTE_FRAGMENT =
  /^(?:subjective|objective|assessment|plan|chief complaint)\b|vitals reviewed|medication reconciliation(?:\s+attempted)?|external records unavailable|no acute distress|continue current care plan/i;

/** Aliases that indicate another field leaked into this value. */
function otherFieldLabelPatterns(forField: DemographicFieldKey | Tab14PatientFieldKey): RegExp[] {
  const patterns: RegExp[] = [];
  for (const def of DEMOGRAPHIC_LABELS) {
    if (def.field === forField) continue;
    if (forField === 'givenName' || forField === 'familyName') {
      if (def.field === 'givenName' || def.field === 'familyName' || def.field === 'fullName') {
        continue;
      }
    }
    for (const alias of def.aliases) {
      if (alias.length < 3) continue;
      patterns.push(
        new RegExp(`(?:^|\\s)${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
      );
    }
  }
  return patterns;
}

export function stripLeadingLabelBleed(raw: string): {
  value: string;
  stripped: boolean;
} {
  let value = collapseWs(raw);
  let stripped = false;
  for (let i = 0; i < 3; i += 1) {
    let matched = false;
    for (const re of LEADING_LABEL_TOKENS) {
      if (re.test(value)) {
        value = collapseWs(value.replace(re, ''));
        stripped = true;
        matched = true;
        break;
      }
    }
    if (!matched) break;
  }
  return { value, stripped };
}

function looksAllCapsName(value: string): boolean {
  const letters = value.replace(/[^A-Za-z?-?]/g, '');
  if (letters.length < 4) return false;
  return letters === letters.toUpperCase() && /[A-Z?-?]/.test(letters);
}

function nameTokenCount(value: string): number {
  return collapseWs(value).split(/\s+/).filter(Boolean).length;
}

function assessFreeTextValue(
  raw: string,
  opts?: { treatAsName?: boolean }
): { value: string; warning?: Tab14FieldWarning } {
  const collapsed = collapseWs(raw);
  if (!collapsed) return { value: '' };

  let value = collapsed;
  let warning: Tab14FieldWarning | undefined;

  for (const re of CLINICAL_LEADING_LABELS) {
    if (re.test(value)) {
      value = collapseWs(value.replace(re, ''));
      warning = { message: VERIFY_LABEL_BLEED, reason: 'label_bleed' };
      break;
    }
  }

  const { value: stripped, stripped: hadBleed } = stripLeadingLabelBleed(value);
  if (hadBleed) {
    value = stripped;
    warning = { message: VERIFY_LABEL_BLEED, reason: 'label_bleed' };
  }

  if (VISIT_NOTE_FRAGMENT.test(value)) {
    warning = warning ?? { message: VERIFY_VISIT_NOTE, reason: 'other' };
  }

  if (opts?.treatAsName) {
    const tokens = nameTokenCount(value);
    if (tokens > 8 || value.length > 120) {
      warning = warning ?? {
        message: VERIFY_SUSPICIOUS_NAME,
        reason: 'suspicious_name',
      };
    }
  }

  return { value, warning };
}

/**
 * Normalize a raw demographic value and optionally return a warning.
 * Safe to call before or after validateDemographicValue.
 */
export function assessDemographicRawValue(
  field: DemographicFieldKey | Tab14PatientFieldKey,
  raw: string
): { value: string; warning?: Tab14FieldWarning } {
  const collapsed = collapseWs(raw);
  if (!collapsed) return { value: '' };

  const { value: stripped, stripped: hadBleed } = stripLeadingLabelBleed(collapsed);
  let value = stripped;
  let warning: Tab14FieldWarning | undefined;

  if (hadBleed) {
    warning = { message: VERIFY_LABEL_BLEED, reason: 'label_bleed' };
  }

  const otherLabels = otherFieldLabelPatterns(field);
  for (const re of otherLabels) {
    if (re.test(value)) {
      warning = warning ?? {
        message: VERIFY_OTHER_LABEL,
        reason: 'contains_other_label',
      };
      break;
    }
  }

  // Digits in a name often mean DOB/phone bleed without an explicit label token.
  if (
    (field === 'givenName' || field === 'familyName' || field === 'fullName') &&
    /\d{2,}/.test(value)
  ) {
    warning = warning ?? {
      message: VERIFY_OTHER_LABEL,
      reason: 'contains_other_label',
    };
  }

  if (field === 'givenName' || field === 'familyName' || field === 'fullName') {
    const tokens = nameTokenCount(value);
    if (tokens > 5 || (looksAllCapsName(value) && hadBleed) || /^name\b/i.test(collapsed)) {
      warning = warning ?? {
        message: VERIFY_SUSPICIOUS_NAME,
        reason: 'suspicious_name',
      };
    }
    if (/^name\b/i.test(value)) {
      const again = stripLeadingLabelBleed(value);
      value = again.value;
      warning = { message: VERIFY_LABEL_BLEED, reason: 'label_bleed' };
    }
  }

  return { value, warning };
}

/**
 * Re-assess already-parsed patient fields (specialized parsers) and attach warnings.
 * Safe for ISO dates and already-split names; also strips residual label bleed.
 */
export function sanitizePatientFieldsWithWarnings(
  fields: Tab14PatientFields
): { fields: Tab14PatientFields; warnings?: Tab14PatientFieldWarnings } {
  const out: Tab14PatientFields = {};
  const warnings: Tab14PatientFieldWarnings = {};
  for (const key of Object.keys(fields) as Tab14PatientFieldKey[]) {
    const raw = fields[key];
    if (!raw?.trim()) continue;
    const assessed = assessDemographicRawValue(key, raw);
    if (!assessed.value) continue;
    out[key] = assessed.value;
    if (assessed.warning) warnings[key] = assessed.warning;
  }
  return {
    fields: out,
    warnings: Object.keys(warnings).length ? warnings : undefined,
  };
}

/** Attach patient-field warnings onto a specialized parse result. */
export function withSanitizedPatientFieldWarnings(
  result: Tab14IntakeParseResult
): Tab14IntakeParseResult {
  const sanitized = sanitizePatientFieldsWithWarnings(result.patientFields);
  return {
    ...result,
    patientFields: sanitized.fields,
    ...(sanitized.warnings || result.fieldWarnings
      ? {
          fieldWarnings: mergeFieldWarnings(result.fieldWarnings, sanitized.warnings),
        }
      : {}),
  };
}

/** Merge warning maps; later (or stronger) reasons replace weaker ones for the same key. */
export function mergeFieldWarnings(
  ...maps: (Tab14PatientFieldWarnings | undefined)[]
): Tab14PatientFieldWarnings | undefined {
  const out: Tab14PatientFieldWarnings = {};
  for (const map of maps) {
    if (!map) continue;
    for (const [k, w] of Object.entries(map) as [
      Tab14PatientFieldKey,
      Tab14FieldWarning,
    ][]) {
      if (w) out[k] = w;
    }
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Keep warnings only for keys that still have a patient field value,
 * and attach the warning that belongs to the winning value source when possible.
 */
export function warningsForWinningPatientFields(
  finalFields: Tab14PatientFields,
  sources: { fields: Tab14PatientFields; warnings?: Tab14PatientFieldWarnings }[]
): Tab14PatientFieldWarnings | undefined {
  const out: Tab14PatientFieldWarnings = {};
  for (const key of Object.keys(finalFields) as Tab14PatientFieldKey[]) {
    const finalVal = finalFields[key]?.trim();
    if (!finalVal) continue;
    let found: Tab14FieldWarning | undefined;
    for (const src of sources) {
      if (src.fields[key]?.trim() === finalVal && src.warnings?.[key]) {
        found = src.warnings[key];
      }
    }
    if (found) out[key] = found;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Mark all populated patient fields when OCR / hard-to-read extraction was used. */
export function annotateOcrSparseWarnings(
  fields: Tab14PatientFields,
  existing?: Tab14PatientFieldWarnings
): Tab14PatientFieldWarnings | undefined {
  const out: Tab14PatientFieldWarnings = { ...(existing ?? {}) };
  for (const key of Object.keys(fields) as Tab14PatientFieldKey[]) {
    if (!fields[key]?.trim()) continue;
    if (!out[key]) {
      out[key] = { message: VERIFY_OCR, reason: 'ocr_sparse' };
    }
  }
  return Object.keys(out).length ? out : undefined;
}

function annotateRowObjectWarnings<T extends Record<string, string>>(
  row: T,
  hardToRead: boolean,
  primaryKey?: keyof T & string
): Partial<Record<keyof T & string, Tab14FieldWarning>> | undefined {
  const out: Partial<Record<keyof T & string, Tab14FieldWarning>> = {};
  const primary = primaryKey ? String(row[primaryKey] ?? '') : '';
  const primaryAssessed = primary
    ? assessFreeTextValue(primary, { treatAsName: true })
    : { value: '', warning: undefined };

  for (const key of Object.keys(row) as (keyof T & string)[]) {
    const raw = String(row[key] ?? '');
    if (!raw.trim()) continue;
    if (hardToRead) {
      out[key] = { message: VERIFY_OCR, reason: 'ocr_sparse' };
      continue;
    }
    if (primaryKey && key === primaryKey && primaryAssessed.warning) {
      out[key] = primaryAssessed.warning;
      continue;
    }
    const assessed = assessFreeTextValue(raw);
    if (assessed.warning) out[key] = assessed.warning;
  }

  return Object.keys(out).length ? out : undefined;
}

export function buildAllergyRowWarnings(
  rows: Tab14AllergyRow[],
  hardToRead = false
): Tab14IndexedRowWarnings<'allergyName' | 'allergyType' | 'allergyTypeOther' | 'severity' | 'reactionNotes' | 'lastObserved'> | undefined {
  const out: Tab14IndexedRowWarnings<'allergyName' | 'allergyType' | 'allergyTypeOther' | 'severity' | 'reactionNotes' | 'lastObserved'> = {};
  rows.forEach((row, index) => {
    const rowWarnings = annotateRowObjectWarnings(row, hardToRead, 'allergyName');
    if (rowWarnings) out[index] = rowWarnings;
  });
  return Object.keys(out).length ? out : undefined;
}

export function buildMedicationRowWarnings(
  rows: Tab14MedicationRow[],
  hardToRead = false
): Tab14IndexedRowWarnings<keyof Tab14MedicationRow> | undefined {
  const out: Tab14IndexedRowWarnings<keyof Tab14MedicationRow> = {};
  rows.forEach((row, index) => {
    const rowWarnings = annotateRowObjectWarnings(row, hardToRead, 'genericName');
    if (rowWarnings) out[index] = rowWarnings;
  });
  return Object.keys(out).length ? out : undefined;
}

export function buildInsuranceRowWarnings(
  rows: Tab14InsuranceRow[],
  hardToRead = false
): Tab14IndexedRowWarnings<keyof Tab14InsuranceRow> | undefined {
  const out: Tab14IndexedRowWarnings<keyof Tab14InsuranceRow> = {};
  rows.forEach((row, index) => {
    const rowWarnings = annotateRowObjectWarnings(row, hardToRead, 'providerName');
    if (rowWarnings) out[index] = rowWarnings;
  });
  return Object.keys(out).length ? out : undefined;
}

export function buildHospitalFieldWarnings(
  visit: Tab14HospitalFields,
  hardToRead = false
): Tab14HospitalFieldWarnings | undefined {
  const out: Tab14HospitalFieldWarnings = {};
  for (const key of Object.keys(visit) as Tab14HospitalFieldKey[]) {
    const raw = visit[key];
    if (!raw?.trim()) continue;
    if (hardToRead) {
      out[key] = { message: VERIFY_OCR, reason: 'ocr_sparse' };
      continue;
    }
    const assessed = assessFreeTextValue(raw, {
      treatAsName: key === 'facilityName' || key === 'attendingPhysician' || key === 'reason',
    });
    if (assessed.warning) out[key] = assessed.warning;
  }
  return Object.keys(out).length ? out : undefined;
}

/**
 * Build session-only warnings for chronic-condition rows.
 * OCR / hard-to-read rows are all reviewable; text-layer rows are warned when they look like
 * encounter-note fragments that should not be accepted as diagnoses.
 */
export function buildChronicConditionWarnings(
  rows: Tab14ChronicRow[],
  hardToRead = false
): Tab14ChronicConditionWarnings | undefined {
  const out: Tab14ChronicConditionWarnings = {};
  rows.forEach((row, index) => {
    const rowWarnings: Partial<Record<Tab14ChronicFieldKey, Tab14FieldWarning>> = {};
    const suspicious = VISIT_NOTE_FRAGMENT.test(row.conditionName.trim());
    for (const key of Object.keys(row) as Tab14ChronicFieldKey[]) {
      if (!row[key]?.trim()) continue;
      // severity has no UI control on Tab14 ? skip invisible warnings
      if (key === 'severity') continue;
      if (hardToRead) {
        rowWarnings[key] = { message: VERIFY_OCR, reason: 'ocr_sparse' };
      } else if (suspicious || key === 'conditionName') {
        const assessed = assessFreeTextValue(row[key], { treatAsName: key === 'conditionName' });
        if (suspicious) {
          rowWarnings[key] = { message: VERIFY_VISIT_NOTE, reason: 'other' };
        } else if (assessed.warning) {
          rowWarnings[key] = assessed.warning;
        }
      }
    }
    if (Object.keys(rowWarnings).length) out[index] = rowWarnings;
  });
  return Object.keys(out).length ? out : undefined;
}

export function clearIndexedFieldWarning<K extends string>(
  warnings: Tab14IndexedRowWarnings<K> | undefined,
  index: number,
  field: K
): Tab14IndexedRowWarnings<K> | undefined {
  if (!warnings?.[index]?.[field]) return warnings;
  const next: Tab14IndexedRowWarnings<K> = { ...warnings };
  const row: Partial<Record<K, Tab14FieldWarning>> = { ...(next[index] ?? {}) };
  delete row[field];
  if (Object.keys(row).length) next[index] = row;
  else delete next[index];
  return Object.keys(next).length ? next : undefined;
}

export function clearChronicConditionWarning(
  warnings: Tab14ChronicConditionWarnings | undefined,
  index: number,
  field: Tab14ChronicFieldKey
): Tab14ChronicConditionWarnings | undefined {
  return clearIndexedFieldWarning(warnings, index, field);
}

/** Reindex warning maps after a row is removed so icons stay on the correct rows. */
export function removeIndexedWarningRow<T>(
  warnings: Partial<Record<number, T>> | undefined,
  index: number
): Partial<Record<number, T>> | undefined {
  if (!warnings) return warnings;
  const next: Partial<Record<number, T>> = {};
  for (const [key, value] of Object.entries(warnings)) {
    const i = Number(key);
    if (Number.isNaN(i) || i === index) continue;
    next[i > index ? i - 1 : i] = value as T;
  }
  return Object.keys(next).length ? next : undefined;
}

export const FIELD_WARNING_MESSAGES = {
  VERIFY_GENERIC,
  VERIFY_LABEL_BLEED,
  VERIFY_OTHER_LABEL,
  VERIFY_SUSPICIOUS_NAME,
  VERIFY_OCR,
  VERIFY_VISIT_NOTE,
} as const;
