/**
 * Athena / problem-list PDFs often state “No Known Problems” (sometimes wrapped
 * as `No Known` + newline + `Problems`). Detect only the Problems section body,
 * not TOC lines or PHQ “these problems…” wording.
 */

export const NO_KNOWN_PROBLEMS_LABEL = 'No Known Problems';

export function normalizeNoKnownProblemsWrap(text: string): string {
  return text.replace(/No\s+Known\s*\n+\s*Problems\b/gi, NO_KNOWN_PROBLEMS_LABEL);
}

/** True when the Problems section explicitly reports no known problems. */
export function detectNoKnownProblems(text: string): boolean {
  const normalized = normalizeNoKnownProblemsWrap(text);

  // Prefer a Problems heading followed by the none statement before Procedures / Allergies.
  if (
    /(?:^|\n)\s*Problems\s+No\s+Known\s+Problems\b/i.test(normalized) ||
    /(?:^|\n)\s*Problems\s*\n+\s*No\s+Known\s+Problems\b/i.test(normalized)
  ) {
    return true;
  }

  // Compact problem-list headers
  if (
    /(?:problem\s*list|active\s*problems|chronic\s*conditions?)\s*[:\n]+\s*No\s+Known\s+Problems\b/i.test(
      normalized
    )
  ) {
    return true;
  }

  return false;
}

/** Sentinel chronic row so Condition Name / notes show the document statement. */
export function noKnownProblemsChronicRow(): {
  conditionName: string;
  icdCode: string;
  diagnosisDate: string;
  severity: string;
  prexisting: string;
  notesChronicConditions: string;
} {
  return {
    conditionName: NO_KNOWN_PROBLEMS_LABEL,
    icdCode: '',
    diagnosisDate: '',
    severity: '',
    prexisting: '',
    notesChronicConditions: NO_KNOWN_PROBLEMS_LABEL,
  };
}
