/**
 * Epic My Health Summary — Immunizations structured rows.
 *
 * Cover / encounter prose uses: `Vaccine Name (Given M/D/YYYY[, M/D/YYYY…])`
 * Global inventory uses: `Immunizations - as of …` then name + admin date(s).
 * Yellow titles are often image-only; callers still pad multi-hit via Encounters visits.
 */

import { tryParseDateToIso } from './intakeDateParse';
import { emptyClinicalEntry, type Tab14ClinicalEntry } from './tab14PortabilitySections';

export type EpicImmunizationShot = {
  /** Vaccine / product name as printed. */
  name: string;
  /** Display Given date(s), e.g. `7/25/2013` or `5/15/2026, 7/25/2013`. */
  givenDate: string;
  /** First administration date as ISO when parseable. */
  givenDateIso: string;
};

function collapseWs(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

const IMM_STOP =
  /\b(?:Social History|Sex and Gender|Last Filed Vital Signs|Plan of Treatment|Procedures|Results|Progress Notes|Functional Status|Consult Notes|Visit Diagnoses|Insurance|Care Teams|Patient Contacts|Reason for Referral|Active Problems|Medications|Allergies|Encounters|Patient Demographics|Note from Mayo Clinic|Hunger Vital Sign)\b/i;

const HEADER_JUNK =
  /^(Immunizations?(?:\s*-\s*as of)?|Immunization|Administration|Dates|Next Due|Given|Vaccine|Type|Status|Documented)$/i;

/** Cut bleed into Social History / Hunger Vital Sign / next TOC sections. */
export function truncateEpicImmunizationsBody(body: string): string {
  const normalized = body.replace(/\r\n/g, '\n');
  const m = IMM_STOP.exec(normalized);
  if (!m || m.index == null || m.index < 12) return normalized.trim();
  const before = normalized.slice(0, m.index).trim();
  return before.length >= 8 ? before : normalized.trim();
}

function formatGivenDisplay(raw: string): string {
  return collapseWs(raw)
    .split(/\s*,\s*/)
    .map((part) => {
      const iso = tryParseDateToIso(part);
      if (!iso) return part;
      const [y, mo, d] = iso.split('-');
      if (!y || !mo || !d) return part;
      return `${Number(mo)}/${Number(d)}/${y}`;
    })
    .join(', ');
}

function firstGivenIso(raw: string): string {
  const first = collapseWs(raw).split(/\s*,\s*/)[0] || '';
  return tryParseDateToIso(first) || first;
}

function isJunkName(name: string): boolean {
  const n = collapseWs(name);
  if (!n || n.length < 2) return true;
  if (HEADER_JUNK.test(n)) return true;
  if (/^as of\b/i.test(n)) return true;
  if (/social history|tobacco|alcohol|hunger/i.test(n)) return true;
  if (/^\d{1,2}\/\d{1,2}\/\d{2,4}$/.test(n)) return true;
  return false;
}

function cleanName(raw: string): string {
  return collapseWs(raw)
    .replace(/^(Immunizations?(?:\s*-\s*as of\s+\d{1,2}\/\d{1,2}\/\d{4})?)\s*/i, '')
    .replace(/^(Immunization|Administration|Dates|Next Due)\s+/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parse Immunization Name + Given Date rows from an Epic immunizations block.
 * Prefer explicit `(Given …)` prose; fall back to as-of admin-date pairs.
 */
export function parseEpicImmunizationShots(rawBody: string): EpicImmunizationShot[] {
  const body = truncateEpicImmunizationsBody(rawBody);
  if (!body) return [];

  const shots: EpicImmunizationShot[] = [];
  const seen = new Set<string>();
  const push = (nameRaw: string, givenRaw: string) => {
    const name = cleanName(nameRaw);
    const givenDate = formatGivenDisplay(givenRaw);
    if (isJunkName(name) || !givenDate) return;
    const key = `${name.toLowerCase()}|${givenDate.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    shots.push({
      name,
      givenDate,
      givenDateIso: firstGivenIso(givenRaw),
    });
  };

  // Cover / encounter: Name (Given d1[, d2…]) — name may itself contain parentheses.
  const givenRe = /\(\s*Given\s+([^)]+)\)/gi;
  let cursor = 0;
  let gm: RegExpExecArray | null;
  let givenHits = 0;
  while ((gm = givenRe.exec(body)) !== null) {
    givenHits += 1;
    const name = body.slice(cursor, gm.index);
    push(name, gm[1] || '');
    cursor = gm.index + gm[0].length;
  }

  if (givenHits > 0) return shots;

  // As-of inventory: strip column headers, then Name + date(s).
  const flat = collapseWs(body)
    .replace(/Immunizations\s*-\s*as of\s+\d{1,2}\/\d{1,2}\/\d{4}/gi, ' ')
    .replace(/\bImmunization\s+Administration\s+Dates\s+Next Due\b/gi, ' ')
    .replace(/\bNext Due\b/gi, ' ');

  const pairRe =
    /([A-Za-z][A-Za-z0-9 ,()/.+-]{1,100}?)\s+(\d{1,2}\/\d{1,2}\/\d{2,4}(?:\s*,\s*\d{1,2}\/\d{1,2}\/\d{2,4})?)(?=\s+(?:[A-Za-z]|SARS)|$)/gi;
  for (const m of flat.matchAll(pairRe)) {
    push(m[1] || '', m[2] || '');
  }
  return shots;
}

export function epicImmunizationShotsToClinicalEntries(
  shots: EpicImmunizationShot[]
): Tab14ClinicalEntry[] {
  return shots.map((shot) => ({
    ...emptyClinicalEntry(),
    title: shot.name,
    date: shot.givenDateIso || shot.givenDate,
    detail: '',
    status: 'Completed',
    notes:
      shot.givenDate.includes(',') && shot.givenDateIso
        ? `Given ${shot.givenDate}`
        : '',
  }));
}

/** Preview bullets for multi-hit cards: `Name — Given date`. */
export function buildEpicImmunizationPreviewLines(body: string, limit = 8): string[] {
  return parseEpicImmunizationShots(body)
    .slice(0, limit)
    .map((s) => `${s.name} — ${s.givenDate}`);
}
