import type { Tab14MedicationRow } from './tab14IntakeTypes';

function collapseWs(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

const DOSE_PATTERN = String.raw`(?:\d+(?:\.\d+)?\s*(?:mg|mcg|g|units?)|\d+\s*tab)`;
const SCHEDULE_PATTERN = String.raw`Nightly|TID|BID|Daily|PRN|QID|Weekly|Once daily|Twice daily|Three times daily`;

function emptyMedication(partial: Partial<Tab14MedicationRow>): Tab14MedicationRow {
  return {
    genericName: partial.genericName ?? '',
    brandName: partial.brandName ?? '',
    dosage: partial.dosage ?? '',
    route: partial.route ?? '',
    frequency: partial.frequency ?? '',
    startDate: partial.startDate ?? '',
    endDate: partial.endDate ?? '',
    purpose: partial.purpose ?? '',
    prescribingPhysician: partial.prescribingPhysician ?? '',
    notesMedication: partial.notesMedication ?? '',
  };
}

function dedupeMedications(rows: Tab14MedicationRow[]): Tab14MedicationRow[] {
  const seen = new Set<string>();
  const out: Tab14MedicationRow[] = [];
  for (const row of rows) {
    const key = `${row.genericName}|${row.dosage}|${row.frequency}`.toLowerCase();
    if (!row.genericName.trim() || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}

/** Strip repeated MAR column headers that appear when a table spans pages. */
function stripMarColumnHeaders(body: string): string {
  return body.replace(/\bMedication\s+Dose\s+Schedule\s+Indication\s+/gi, ' ');
}

/** Extract MAR body from first table header through the next major section. */
export function extractMedicationAdministrationSection(text: string): string {
  const flat = collapseWs(text);
  const start = flat.search(/MEDICATION ADMINISTRATION RECORD/i);
  if (start < 0) return '';

  let body = flat.slice(start);
  body = body.replace(
    /^MEDICATION ADMINISTRATION RECORD\s+(?:Medication\s+Dose\s+Schedule\s+Indication\s+)?/i,
    ''
  );
  body = stripMarColumnHeaders(body);

  const end = body.search(
    /\b(?:HIGH RISK MEDICATION FLAGS|LAB MONITORING|ENCOUNTER NOTE \d+|MISSING FIELDS|PROBLEMS)\b/i
  );
  return (end >= 0 ? body.slice(0, end) : body).trim();
}

function parseNumberedMarRows(section: string): Tab14MedicationRow[] {
  const rows: Tab14MedicationRow[] = [];
  const numberedRe = new RegExp(
    String.raw`\bMedication\s+(\d+)\s+(${DOSE_PATTERN})\s+(${SCHEDULE_PATTERN})\s+([A-Za-z]+)`,
    'gi'
  );
  for (const match of section.matchAll(numberedRe)) {
    rows.push(
      emptyMedication({
        genericName: `Medication ${match[1]}`,
        dosage: collapseWs(match[2]),
        frequency: collapseWs(match[3]),
        purpose: collapseWs(match[4]),
      })
    );
  }
  return rows;
}

/** Athena-style column rows: Metformin 500 mg Oral Daily Diabetes */
function parseNamedMarRows(section: string): Tab14MedicationRow[] {
  const rows: Tab14MedicationRow[] = [];
  const namedRe = new RegExp(
    String.raw`\b([A-Z][A-Za-z-]+)\s+(${DOSE_PATTERN})(?:\s+(?:Oral|Inhaled|IV|Subcutaneous|Topical|PO))?\s+(${SCHEDULE_PATTERN})(?:\s+([A-Za-z]{2,}))?(?=\s+[A-Z][A-Za-z-]+\s+(?:\d+(?:\.\d+)?\s*(?:mg|mcg|g|units?)|\d+\s*tab)|\s+Medication\s+\d+|\s+HIGH RISK|$)`,
    'g'
  );
  for (const match of section.matchAll(namedRe)) {
    if (/^Medication$/i.test(match[1])) continue;
    rows.push(
      emptyMedication({
        genericName: match[1],
        dosage: collapseWs(match[2]),
        frequency: collapseWs(match[3]),
        purpose: collapseWs(match[4] ?? ''),
      })
    );
  }
  return rows;
}

/**
 * Parse Medication Administration Record tables.
 * Supports numbered test rows (Medication 1, Medication 2, ) and real drug names.
 */
export function parseMedicationAdministrationRecord(text: string): Tab14MedicationRow[] {
  const section = extractMedicationAdministrationSection(text);
  if (!section) return [];

  const numbered = parseNumberedMarRows(section);
  if (numbered.length > 0) {
    return dedupeMedications(numbered);
  }

  return dedupeMedications(parseNamedMarRows(section));
}

export function hasMedicationAdministrationRecord(text: string): boolean {
  return /MEDICATION ADMINISTRATION RECORD/i.test(text);
}
