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
  Tab14ChronicConditionWarnings,
  Tab14ChronicFieldKey,
  Tab14ChronicRow,
  Tab14FieldWarning,
  Tab14PatientFieldKey,
  Tab14PatientFieldWarnings,
  Tab14PatientFields,
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
  'Document text was sparse or OCR-assisted; verify this value against the source document.';

/** Leading tokens that often bleed into extracted values (e.g. "name MARIA GARCIA"). */
const LEADING_LABEL_TOKENS: RegExp[] = [
  /^(?:patient\s+)?(?:full\s+)?name\b[:#]?\s+/i,
  /^(?:given|first|family|last|child)\s+name\b[:#]?\s+/i,
  /^(?:nombre(?:\s+completo)?|apellido)\b[:#]?\s+/i,
  /^(?:d\.?o\.?b\.?|date\s+of\s+birth|birth\s+date|born)\b[:#]?\s+/i,
  /^(?:fecha\s+de\s+nacimiento)\b[:#]?\s+/i,
  /^(?:email|e-mail|correo(?:\s+electr[où]nico)?)\b[:#]?\s+/i,
  /^(?:phone(?:\s+number)?|mobile|cell|tel[eù]fono)\b[:#]?\s+/i,
  /^(?:address|home\s+address|street\s+address|direcci[où]n)\b[:#]?\s+/i,
  /^(?:sex(?:\s+at\s+birth)?|gender|sexo)\b[:#]?\s+/i,
  /^(?:blood\s+type|tipo\s+de\s+sangre)\b[:#]?\s+/i,
  /^(?:race|raza|ethnicity|etnicidad)\b[:#]?\s+/i,
  /^(?:preferred\s+language|language|idioma(?:\s+preferido)?)\b[:#]?\s+/i,
  /^(?:marital\s+status|estado\s+civil)\b[:#]?\s+/i,
];

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
  const letters = value.replace(/[^A-Za-zù-ù]/g, '');
  if (letters.length < 4) return false;
  return letters === letters.toUpperCase() && /[A-Zù-ù]/.test(letters);
}

function nameTokenCount(value: string): number {
  return collapseWs(value).split(/\s+/).filter(Boolean).length;
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

  if (field === 'givenName' || field === 'familyName' || field === 'fullName') {
    const tokens = nameTokenCount(value);
    if (tokens > 5 || (looksAllCapsName(value) && hadBleed) || /^name\b/i.test(collapsed)) {
      warning = warning ?? {
        message: VERIFY_SUSPICIOUS_NAME,
        reason: 'suspicious_name',
      };
    }
    // Repeated leading "name" after incomplete strip
    if (/^name\b/i.test(value)) {
      const again = stripLeadingLabelBleed(value);
      value = again.value;
      warning = { message: VERIFY_LABEL_BLEED, reason: 'label_bleed' };
    }
  }

  return { value, warning };
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
    // Prefer the last source that supplied this exact value and had a warning
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

/** Mark all populated patient fields when OCR/sparse extraction was used. */
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

const CHRONIC_VISIT_FRAGMENT =
  /^(?:subjective|objective|assessment|plan|chief complaint)\b|vitals reviewed|medication reconciliation(?:\s+attempted)?|external records unavailable|no acute distress|continue current care plan/i;

/**
 * Build session-only warnings for chronic-condition rows.
 * OCR rows are all reviewable; text-layer rows are warned only when they look like
 * encounter-note fragments that should not be accepted as diagnoses.
 */
export function buildChronicConditionWarnings(
  rows: Tab14ChronicRow[],
  usedOcr = false
): Tab14ChronicConditionWarnings | undefined {
  const out: Tab14ChronicConditionWarnings = {};
  rows.forEach((row, index) => {
    const rowWarnings: Partial<Record<Tab14ChronicFieldKey, Tab14FieldWarning>> = {};
    const suspicious = CHRONIC_VISIT_FRAGMENT.test(row.conditionName.trim());
    for (const key of Object.keys(row) as Tab14ChronicFieldKey[]) {
      if (!row[key]?.trim()) continue;
      if (usedOcr) {
        rowWarnings[key] = { message: VERIFY_OCR, reason: 'ocr_sparse' };
      } else if (suspicious) {
        rowWarnings[key] = {
          message:
            'This may be visit-note text rather than a chronic condition; verify against the source document.',
          reason: 'other',
        };
      }
    }
    if (Object.keys(rowWarnings).length) out[index] = rowWarnings;
  });
  return Object.keys(out).length ? out : undefined;
}

export function clearChronicConditionWarning(
  warnings: Tab14ChronicConditionWarnings | undefined,
  index: number,
  field: Tab14ChronicFieldKey
): Tab14ChronicConditionWarnings | undefined {
  if (!warnings?.[index]?.[field]) return warnings;
  const next = { ...warnings };
  const row = { ...next[index] };
  delete row[field];
  if (Object.keys(row).length) next[index] = row;
  else delete next[index];
  return Object.keys(next).length ? next : undefined;
}

export const FIELD_WARNING_MESSAGES = {
  VERIFY_GENERIC,
  VERIFY_LABEL_BLEED,
  VERIFY_OTHER_LABEL,
  VERIFY_SUSPICIOUS_NAME,
  VERIFY_OCR,
} as const;
