import type {
  Tab14ChronicRow,
  Tab14HospitalFields,
  Tab14InsuranceRow,
  Tab14MedicationRow,
} from "./tab14IntakeTypes";

/** Shared normalization for merge/dedupe keys. */
export function normalizeMergeText(value: string): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^["']+|["']+$/g, "")
    .replace(/[.,;:!?]+$/g, "")
    .replace(/^[.,;:!?]+/g, "")
    .trim();
}

/** Strip punctuation/spacing from policy and member IDs for comparison. */
export function normalizeInsuranceId(value: string): string {
  return normalizeMergeText(value).replace(/[^a-z0-9]/g, "");
}

export type MergeRowsResult<T> = {
  rows: T[];
  addedCount: number;
};

function medicationKey(row: Tab14MedicationRow): string {
  const name =
    normalizeMergeText(row.genericName) || normalizeMergeText(row.brandName);
  if (!name) return "";
  const dosage = normalizeMergeText(row.dosage);
  const frequency = normalizeMergeText(row.frequency);
  return [name, dosage, frequency].filter(Boolean).join("|");
}

export function isPlaceholderMedication(row: Tab14MedicationRow): boolean {
  return medicationKey(row) === "";
}

export function dedupeMedicationRows(
  rows: Tab14MedicationRow[]
): Tab14MedicationRow[] {
  const seen = new Set<string>();
  const deduped: Tab14MedicationRow[] = [];

  for (const row of rows) {
    const key = medicationKey(row);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }

  return deduped;
}

/** Append PDF medications; dedupe on name + dosage + frequency. */
export function mergeMedicationsFromPdf(
  existing: Tab14MedicationRow[],
  incoming: Tab14MedicationRow[]
): MergeRowsResult<Tab14MedicationRow> {
  const kept = dedupeMedicationRows(existing);
  if (incoming.length === 0) {
    return { rows: kept.length > 0 ? kept : existing, addedCount: 0 };
  }

  const seen = new Set(kept.map(medicationKey));
  const merged = [...kept];
  let addedCount = 0;

  for (const row of incoming) {
    const key = medicationKey(row);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
    addedCount += 1;
  }

  return { rows: dedupeMedicationRows(merged), addedCount };
}

function chronicKey(row: Tab14ChronicRow): string {
  const icd = normalizeMergeText(row.icdCode).replace(/\./g, "");
  if (icd) return `icd:${icd}`;
  const name = normalizeMergeText(row.conditionName);
  return name ? `name:${name}` : "";
}

export function isPlaceholderChronic(row: Tab14ChronicRow): boolean {
  return chronicKey(row) === "";
}

export function dedupeChronicRows(rows: Tab14ChronicRow[]): Tab14ChronicRow[] {
  const seen = new Set<string>();
  const deduped: Tab14ChronicRow[] = [];

  for (const row of rows) {
    const key = chronicKey(row);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }

  return deduped;
}

/** Append PDF chronic conditions; dedupe on ICD code or condition name. */
export function mergeChronicConditionsFromPdf(
  existing: Tab14ChronicRow[],
  incoming: Tab14ChronicRow[]
): MergeRowsResult<Tab14ChronicRow> {
  const kept = dedupeChronicRows(existing);
  if (incoming.length === 0) {
    return { rows: kept.length > 0 ? kept : existing, addedCount: 0 };
  }

  const seen = new Set(kept.map(chronicKey));
  const merged = [...kept];
  let addedCount = 0;

  for (const row of incoming) {
    const key = chronicKey(row);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    merged.push(row);
    addedCount += 1;
  }

  return { rows: dedupeChronicRows(merged), addedCount };
}

function insuranceKey(row: Tab14InsuranceRow): string {
  const provider = normalizeMergeText(row.providerName);
  const policy = normalizeInsuranceId(row.policyNumber);
  if (policy) return `policy:${provider}|${policy}`;
  const member = normalizeInsuranceId(row.memberID);
  if (member) return `member:${provider}|${member}`;
  const plan = normalizeMergeText(row.planName);
  if (provider && plan) return `plan:${provider}|${plan}`;
  if (provider) return `provider:${provider}`;
  return "";
}

export function isPlaceholderInsurance(row: Tab14InsuranceRow): boolean {
  return insuranceKey(row) === "";
}

export function dedupeInsuranceRows(
  rows: Tab14InsuranceRow[]
): Tab14InsuranceRow[] {
  const seen = new Set<string>();
  const deduped: Tab14InsuranceRow[] = [];

  for (const row of rows) {
    const key = insuranceKey(row);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    deduped.push(row);
  }

  return deduped;
}

const INSURANCE_FIELDS: (keyof Tab14InsuranceRow)[] = [
  "providerName",
  "policyNumber",
  "planName",
  "memberID",
  "groupNumber",
  "startDate",
  "endDate",
  "payerId",
  "guarantor",
  "memberName",
  "relationToSubscriber",
  "subscriberName",
  "subscriberId",
  "subscriberDob",
  "billingAddress",
];

/** Fill empty insurance fields from incoming without overwriting populated values. */
export function fillEmptyInsuranceFields(
  existing: Tab14InsuranceRow,
  incoming: Tab14InsuranceRow
): { row: Tab14InsuranceRow; filledFieldCount: number } {
  const merged: Tab14InsuranceRow = { ...existing };
  let filledFieldCount = 0;

  for (const field of INSURANCE_FIELDS) {
    const incomingVal = String(incoming[field] ?? "").trim();
    if (!incomingVal) continue;
    const existingVal = String(merged[field] ?? "").trim();
    if (existingVal) continue;
    merged[field] = incomingVal;
    filledFieldCount += 1;
  }

  return { row: merged, filledFieldCount };
}

export type MergeInsurancesResult = MergeRowsResult<Tab14InsuranceRow> & {
  /** Empty fields filled on existing policies matched from the PDF. */
  filledFieldCount: number;
};

/**
 * Merge insurances parsed from a PDF upload into policies already on the form.
 * New policies are appended; duplicates match on policy number, member ID, or plan.
 * Matching rows only fill empty fields — existing values are never overwritten.
 */
export function mergeInsurancesFromPdf(
  existing: Tab14InsuranceRow[],
  incoming: Tab14InsuranceRow[]
): MergeInsurancesResult {
  const kept = dedupeInsuranceRows(existing);
  if (incoming.length === 0) {
    return {
      rows: kept.length > 0 ? kept : existing,
      addedCount: 0,
      filledFieldCount: 0,
    };
  }

  const merged = kept.length > 0 ? [...kept] : [];
  const indexByKey = new Map<string, number>();
  merged.forEach((row, index) => {
    const key = insuranceKey(row);
    if (key) indexByKey.set(key, index);
  });

  let addedCount = 0;
  let filledFieldCount = 0;

  for (const row of incoming) {
    if (isPlaceholderInsurance(row)) continue;
    const key = insuranceKey(row);
    const existingIndex = indexByKey.get(key);

    if (existingIndex !== undefined) {
      const fillResult = fillEmptyInsuranceFields(merged[existingIndex], row);
      merged[existingIndex] = fillResult.row;
      filledFieldCount += fillResult.filledFieldCount;
      continue;
    }

    merged.push(row);
    indexByKey.set(key, merged.length - 1);
    addedCount += 1;
  }

  return {
    rows: dedupeInsuranceRows(merged),
    addedCount,
    filledFieldCount,
  };
}

export type MergeHospitalVisitResult = {
  visit: Tab14HospitalFields;
  /** Count of empty fields filled from the PDF. */
  addedFieldCount: number;
};

/** Fill empty hospital-visit fields from PDF without overwriting populated values. */
export function mergeHospitalVisitFromPdf(
  existing: Tab14HospitalFields,
  incoming: Tab14HospitalFields
): MergeHospitalVisitResult {
  const merged: Tab14HospitalFields = { ...existing };
  let addedFieldCount = 0;

  for (const [key, value] of Object.entries(incoming) as [
    keyof Tab14HospitalFields,
    string | undefined,
  ][]) {
    const incomingVal = String(value ?? "").trim();
    if (!incomingVal) continue;
    const existingVal = String(merged[key] ?? "").trim();
    if (existingVal) continue;
    merged[key] = incomingVal;
    addedFieldCount += 1;
  }

  return { visit: merged, addedFieldCount };
}

export function hasHospitalVisitData(fields: Tab14HospitalFields): boolean {
  return Object.values(fields).some((v) => String(v ?? "").trim() !== "");
}

function hospitalVisitKey(fields: Tab14HospitalFields): string {
  const date = String(fields.visitDate ?? "").trim().toLowerCase();
  const facility = String(fields.facilityName ?? "").trim().toLowerCase();
  if (!date && !facility) return "";
  return `${date}|${facility}`;
}

export type MergeHospitalVisitsResult = {
  rows: Tab14HospitalFields[];
  addedCount: number;
  filledFieldCount: number;
};

export function mergeHospitalVisitsFromPdf(
  existing: Tab14HospitalFields[],
  incoming: Tab14HospitalFields
): MergeHospitalVisitsResult {
  if (!hasHospitalVisitData(incoming)) {
    return { rows: existing, addedCount: 0, filledFieldCount: 0 };
  }

  const rows = existing.map((row) => ({ ...row }));
  const incomingKey = hospitalVisitKey(incoming);

  let matchIndex = -1;
  if (incomingKey) {
    matchIndex = rows.findIndex((row) => hospitalVisitKey(row) === incomingKey);
  }
  if (matchIndex < 0) {
    matchIndex = rows.findIndex((row) => !hasHospitalVisitData(row));
  }

  if (matchIndex >= 0) {
    const merged = mergeHospitalVisitFromPdf(rows[matchIndex], incoming);
    rows[matchIndex] = merged.visit;
    return {
      rows,
      addedCount: 0,
      filledFieldCount: merged.addedFieldCount,
    };
  }

  return {
    rows: [...rows, incoming],
    addedCount: 1,
    filledFieldCount: 0,
  };
}
