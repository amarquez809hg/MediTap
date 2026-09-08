/**
 * Lightweight terminology hints for PDF-imported clinical strings.
 * Not a full RxNorm/SNOMED service — flags values outside a known demo catalog.
 */

import type { Tab14FieldWarning } from './tab14IntakeTypes';

const VERIFY_TERMINOLOGY =
  'This value is not in MediTap’s known clinical catalog; verify spelling/coding against the source document.';

/** Common allergens / meds / conditions seen in fixtures + typical intake. */
export const KNOWN_ALLERGENS = [
  'penicillin',
  'amoxicillin',
  'sulfa',
  'sulfonamide',
  'aspirin',
  'ibuprofen',
  'latex',
  'peanut',
  'peanuts',
  'shellfish',
  'egg',
  'eggs',
  'milk',
  'dairy',
  'codeine',
  'morphine',
  'contrast',
  'iodine',
  'nkda',
  'nka',
  'none',
  'no known',
];

export const KNOWN_MEDICATIONS = [
  'lisinopril',
  'metformin',
  'atorvastatin',
  'amlodipine',
  'metoprolol',
  'omeprazole',
  'levothyroxine',
  'albuterol',
  'gabapentin',
  'hydrochlorothiazide',
  'losartan',
  'sertraline',
  'aspirin',
  'ibuprofen',
  'acetaminophen',
  'warfarin',
  'insulin',
  'prednisone',
];

export const KNOWN_CONDITIONS = [
  'hypertension',
  'diabetes',
  'type 2 diabetes',
  'type 1 diabetes',
  'asthma',
  'copd',
  'depression',
  'anxiety',
  'hypothyroidism',
  'hyperlipidemia',
  'gerd',
  'migraine',
  'osteoarthritis',
  'ckd',
  'chronic kidney',
  'cad',
  'coronary',
  'obesity',
];

function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function catalogHit(value: string, catalog: string[]): boolean {
  const n = norm(value);
  if (!n || n.length < 3) return true; // too short / empty — other validators handle
  return catalog.some((c) => n === c || n.includes(c) || c.includes(n));
}

export function assessTerminologyHint(
  value: string,
  kind: 'allergen' | 'medication' | 'condition'
): Tab14FieldWarning | undefined {
  const raw = value.trim();
  if (!raw) return undefined;
  const catalog =
    kind === 'allergen'
      ? KNOWN_ALLERGENS
      : kind === 'medication'
        ? KNOWN_MEDICATIONS
        : KNOWN_CONDITIONS;
  if (catalogHit(raw, catalog)) return undefined;
  return {
    message: VERIFY_TERMINOLOGY,
    reason: 'terminology',
    sourceLabel: `Imported ${kind}`,
  };
}

/** Find nearest `--- page N ---` marker before a value occurrence in extracted text. */
export function findSourcePageForValue(
  documentText: string,
  value: string
): number | undefined {
  const needle = value.trim();
  if (!needle || needle.length < 3) return undefined;
  const idx = documentText.toLowerCase().indexOf(needle.toLowerCase());
  if (idx < 0) return undefined;
  const before = documentText.slice(0, idx);
  const matches = [...before.matchAll(/---\s*page\s+(\d+)\s*---/gi)];
  if (matches.length === 0) return undefined;
  const last = matches[matches.length - 1];
  const n = Number(last[1]);
  return Number.isFinite(n) ? n : undefined;
}

export function withProvenance(
  warning: Tab14FieldWarning,
  opts?: { page?: number; label?: string }
): Tab14FieldWarning {
  return {
    ...warning,
    sourcePage: opts?.page ?? warning.sourcePage,
    sourceLabel: opts?.label ?? warning.sourceLabel,
  };
}
