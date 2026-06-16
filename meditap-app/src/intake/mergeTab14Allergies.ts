import type { Tab14AllergyRow } from "./tab14IntakeTypes";

/**
 * Normalize allergy name for deduplication: case-insensitive, collapsed whitespace,
 * stripped outer punctuation, and optional trailing "allergy/allergies" suffix.
 */
export function normalizeAllergyName(name: string): string {
  let normalized = (name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/^["']+|["']+$/g, "")
    .replace(/[.,;:!?]+$/g, "")
    .replace(/^[.,;:!?]+/g, "")
    .replace(/\s+allerg(?:y|ies)$/g, "")
    .trim();
  return normalized;
}

export function isPlaceholderAllergy(row: Tab14AllergyRow): boolean {
  return normalizeAllergyName(row.allergyName ?? "") === "";
}

/** Collapse duplicate allergy rows; first occurrence wins. */
export function dedupeAllergyRows(rows: Tab14AllergyRow[]): Tab14AllergyRow[] {
  const seen = new Set<string>();
  const deduped: Tab14AllergyRow[] = [];

  for (const row of rows) {
    if (isPlaceholderAllergy(row)) continue;
    const key = normalizeAllergyName(row.allergyName);
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push({
      ...row,
      allergyTypeOther: row.allergyTypeOther ?? "",
    });
  }

  return deduped;
}

export type MergeAllergiesFromPdfResult = {
  allergies: Tab14AllergyRow[];
  noAllergies: boolean;
  /** New rows appended from this PDF (not already on the form). */
  addedCount: number;
};

/**
 * Merge allergies parsed from a PDF upload into allergies already on the Tab14 form.
 * Existing rows are kept; new names are appended. Duplicates match on normalized name.
 * NKDA from the PDF clears the list only when the form had no allergies yet.
 */
export function mergeAllergiesFromPdf(
  existing: Tab14AllergyRow[],
  incoming: Tab14AllergyRow[],
  pdfSaysNkda: boolean
): MergeAllergiesFromPdfResult {
  const kept = dedupeAllergyRows(existing);

  if (incoming.length > 0) {
    const seen = new Set(kept.map((row) => normalizeAllergyName(row.allergyName)));
    const merged = [...kept];
    let addedCount = 0;

    for (const row of incoming) {
      if (isPlaceholderAllergy(row)) continue;
      const key = normalizeAllergyName(row.allergyName);
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push({
        ...row,
        allergyTypeOther: row.allergyTypeOther ?? "",
      });
      addedCount += 1;
    }

    return {
      allergies: dedupeAllergyRows(merged),
      noAllergies: false,
      addedCount,
    };
  }

  if (pdfSaysNkda) {
    if (kept.length === 0) {
      return { allergies: [], noAllergies: true, addedCount: 0 };
    }
    return { allergies: kept, noAllergies: false, addedCount: 0 };
  }

  return {
    allergies: kept.length > 0 ? kept : existing,
    noAllergies: kept.length === 0,
    addedCount: 0,
  };
}
