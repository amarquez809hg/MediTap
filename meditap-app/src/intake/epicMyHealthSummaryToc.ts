/**
 * Epic My Health Summary (Mayo / Lucy-style Continuity) — left-menu TOC lock.
 *
 * Source of truth for Tab14 Epic selector: Jane Doe ~540-page My Health Summary.
 * Visual PDF uses color rails + section titles (often image/OCR on cover pages).
 * Text layer often uses Mayo aliases: `Section - as of MM/DD/YYYY`.
 *
 * Multi-intake rule: the PDF packs many clinical sessions. A new intake starts when
 * the patient-name banner / “Patient Health Summary…” header repeats (see screenshot
 * pattern: Lucy! / Mrs. Jane A. Smith-Doe / Patient Health Summary, generated on …).
 * Later sessions may add or drop sections — always detect by title, not by page index.
 */

import type { Tab14SectionKey } from './tab14PortabilitySections';

/** Visual rail colors from the Epic/Lucy My Health Summary print. */
export type EpicSectionColor =
  | 'green'
  | 'gray'
  | 'red'
  | 'blue'
  | 'lightBlue'
  | 'yellow'
  | 'darkBlue'
  | 'purple'
  | 'blueGreen';

export type EpicTocEntry = {
  /** Exact (or preferred) PDF / Lucy subtitle */
  title: string;
  color: EpicSectionColor;
  /** Tab14 left-menu key this section feeds */
  key: Tab14SectionKey;
  /**
   * When false, tracked for parse boundaries but not a separate sidebar row
   * (merged into `key`, e.g. Ended Medications → medications).
   */
  sidebar?: boolean;
  /** Text-layer / dialect aliases seen in Jane Doe + Mayo Continuity exports */
  aliases?: string[];
  /** Parsing notes for engineers */
  notes?: string;
};

/**
 * Canonical Epic section order for Jane Doe My Health Summary.
 * Parenthetical colors match the user’s tracking list.
 */
export const EPIC_MY_HEALTH_SUMMARY_TOC: EpicTocEntry[] = [
  {
    title: 'Patient Demographics',
    color: 'green',
    key: 'demographics',
    aliases: [
      'Patient Demographics',
      'Demographics',
      'Patient Health Summary',
      'Patient Name',
      'Patient Address',
    ],
    notes:
      'Often image-only on page 1 — needs OCR. Multi-hit: cover + per-visit reprints (PDF Find ~33 on Jane Doe). Sparse proxy = cover + Encounters inventory. Columns: Address, Name, Communication, Language, Race, Ethnicity, Marital Status.',
  },
  {
    title: 'Note from Mayo Clinic',
    color: 'green',
    key: 'patientInstructions',
    aliases: [
      'Note from Mayo Clinic',
      'Note from Mayo',
      'Note from ', // clinic name varies
      'Note from Mayo Clinic This document contains information',
    ],
    notes:
      'Clinic name varies (Mayo, regional affiliate, etc.). Multi-hit: cover disclaimer + per-visit reprints (PDF Find ~33 on Jane Doe). Sparse proxy = cover + Encounters inventory; dated like Patient Demographics.',
  },
  {
    title: 'Reason for Referral',
    color: 'gray',
    key: 'reasonForReferral',
    aliases: ['Reason for Referral', 'Reason for Visit'],
  },
  {
    title: 'Encounter Details',
    color: 'gray',
    key: 'pastEncounters',
    aliases: [
      'Encounter Details',
      'Encounters',
      'Encounters - as of',
      'Hospital Encounter',
    ],
  },
  {
    title: 'Allergies',
    color: 'red',
    key: 'allergies',
    aliases: [
      'Allergies',
      'Allergies - as of',
      'Active Allergy Reactions',
    ],
  },
  {
    title: 'Medications',
    color: 'blue',
    key: 'medications',
    aliases: [
      'Medications',
      'Medications - as of',
      'Medication SigDispense',
      'Administered Medications',
    ],
  },
  {
    title: 'Ended Medications',
    color: 'lightBlue',
    key: 'medications',
    sidebar: false,
    aliases: ['Ended Medications', 'Discontinued', '(Discontinued)'],
    notes: 'Same medications model; status=ended/discontinued. Not a separate Tab14 key yet.',
  },
  {
    title: 'Active Problems',
    color: 'yellow',
    key: 'problems',
    aliases: [
      'Active Problems',
      'Active Problems - as of',
      'Active Problems - documented',
    ],
  },
  {
    title: 'Immunizations',
    color: 'darkBlue',
    key: 'immunizations',
    aliases: ['Immunizations', 'Immunizations - as of'],
  },
  {
    title: 'Social History',
    color: 'yellow',
    key: 'socialHistory',
    aliases: ['Social History', 'Social History - as of'],
  },
  {
    title: 'Last Filed Vital Signs',
    color: 'green',
    key: 'vitals',
    aliases: [
      'Last Filed Vital Signs',
      'Last Filed Vital Signs - as of',
      'Last Filed Vital Signs',
    ],
  },
  {
    title: 'Progress Notes',
    color: 'purple',
    key: 'notes',
    aliases: ['Progress Notes', 'Notes', 'Notes - as of'],
  },
  {
    title: 'Functional Status',
    color: 'gray',
    key: 'functionalStatus',
    aliases: ['Functional Status', 'Functional Status - as of'],
  },
  {
    title: 'Consult Notes',
    color: 'purple',
    key: 'procedureNotes',
    aliases: ['Consult Notes', 'Consultation Notes'],
  },
  {
    title: 'Medications at Time of Discharge',
    color: 'blue',
    key: 'medications',
    sidebar: false,
    aliases: [
      'Medications at Time of Discharge',
      'Discharge Medications',
      'Medications at Discharge',
    ],
    notes: 'Episode-local med list; fold into medications with encounter provenance.',
  },
  {
    title: 'Plan of Treatment',
    color: 'gray',
    key: 'planOfTreatment',
    aliases: [
      'Plan of Treatment',
      'Plan of Treatment - as of',
      'Plan of Treatment',
    ],
  },
  {
    title: 'Procedures',
    color: 'purple',
    key: 'procedures',
    aliases: ['Procedures', 'Procedures - as of'],
  },
  {
    title: 'Results',
    color: 'green',
    key: 'results',
    aliases: ['Results', 'Results - as of', 'Final result', 'Edited Result - Final'],
    notes:
      'Largest section. Prefer column/row/table parse; (ABNORMAL) / red flags; same-color rules = panel separators; multi-session Results - as of DATE.',
  },
  {
    title: 'Visit Diagnoses',
    color: 'yellow',
    key: 'assessment',
    aliases: [
      'Visit Diagnoses',
      'Visit Diagnoses - documented in this encounter',
      'Encounter Diagnoses',
    ],
  },
  {
    title: 'Insurance',
    color: 'blueGreen',
    key: 'payers',
    aliases: ['Insurance', 'Insurance - documented', 'Payers'],
  },
  {
    title: 'Care Teams',
    color: 'gray',
    key: 'careTeam',
    aliases: ['Care Teams', 'Care Team', 'Care Team Members'],
  },
  {
    title: 'Patient Contacts',
    color: 'green',
    key: 'relatedPerson',
    aliases: ['Patient Contacts', 'Emergency Contact', 'Related Person'],
  },
  {
    title: 'Document Information',
    color: 'green',
    key: 'notes',
    sidebar: false,
    aliases: ['Document Information', 'Document Info'],
    notes: 'Usually end-of-session metadata; tracked for boundaries, not a dedicated panel yet.',
  },
];

/** Sidebar-only rows (unique Tab14 keys, Epic document order). */
export function epicMyHealthSummarySidebarKeys(): Tab14SectionKey[] {
  const seen = new Set<Tab14SectionKey>();
  const keys: Tab14SectionKey[] = [];
  for (const row of EPIC_MY_HEALTH_SUMMARY_TOC) {
    if (row.sidebar === false) continue;
    if (seen.has(row.key)) continue;
    seen.add(row.key);
    keys.push(row.key);
  }
  return keys;
}

/** Epic left-menu display titles (override Athena TOC wording). */
export const EPIC_SIDEBAR_LABELS: Partial<Record<Tab14SectionKey, string>> = {
  demographics: 'Patient Demographics',
  patientInstructions: 'Note from Clinic',
  reasonForReferral: 'Reason for Referral',
  pastEncounters: 'Encounter Details',
  allergies: 'Allergies',
  medications: 'Medications',
  problems: 'Active Problems',
  immunizations: 'Immunizations',
  socialHistory: 'Social History',
  vitals: 'Last Filed Vital Signs',
  notes: 'Progress Notes',
  functionalStatus: 'Functional Status',
  procedureNotes: 'Consult Notes',
  planOfTreatment: 'Plan of Treatment',
  procedures: 'Procedures',
  results: 'Results',
  assessment: 'Visit Diagnoses',
  payers: 'Insurance',
  careTeam: 'Care Teams',
  relatedPerson: 'Patient Contacts',
};

/** Titles that open a new clinical intake / session inside one PDF. */
export const EPIC_INTAKE_START_PATTERNS: RegExp[] = [
  /** Strongest signal in Jane Doe Continuity: one block per visit (many hits in PDF search). */
  /(?:^|\n)\s*Encounter Details\b/i,
  /Patient\s+Health\s+Summary\s*,?\s*generated\s+on/i,
  /My\s+Health\s+Summary/i,
  /Mrs?\.\s+[A-Z][a-z]+(?:\s+[A-Z]\.?)?\s+[A-Z][A-Za-z'-]+/i,
  /Patient\s+Demographics\s*[-–—]?\s*(?:Female|Male)/i,
  /\bLucy!\b/i,
];

export type EpicEncounterDetailSession = {
  /** 0-based index in document order */
  index: number;
  /** Character offset in the source extract */
  startIndex: number;
  /** Full text from this Encounter Details header until the next one (or EOF) */
  body: string;
  /** Parsed when header fields are present */
  dateRaw?: string;
  visitType?: string;
  department?: string;
  careTeamRaw?: string;
};

/**
 * Split on every `Encounter Details` header (the pattern you tracked in PDF search).
 * Each hit is one clinical visit / intake slice with nested
 * `Allergies|Medications|… - documented as of this encounter` subsections.
 */
export function sliceEpicEncounterDetailSessions(text: string): EpicEncounterDetailSession[] {
  const normalized = text.replace(/\r\n/g, '\n');
  const re = /(?:(?:^|\n)([ \t]*Encounter Details\b[^\n]*)|(?<=[^A-Za-z\n])(Encounter Details\b[^\n]*))/gi;
  const hits: { index: number; header: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalized)) !== null) {
    // Prefer the start of "Encounter Details" itself (skip leading newline/spaces)
    const header = m[1] ?? m[2] ?? m[0];
    const rel = header.search(/Encounter Details/i);
    const index = m.index + (rel >= 0 ? (m[0].length - header.length) + rel : 0);
    // Dedup near-duplicates (same header within 20 chars)
    if (hits.some((h) => Math.abs(h.index - index) < 20)) continue;
    hits.push({ index, header: collapseHeaderLine(header) });
  }
  if (hits.length === 0) return [];

  const sessions: EpicEncounterDetailSession[] = [];
  for (let i = 0; i < hits.length; i++) {
    const start = hits[i]!.index;
    const end = i + 1 < hits.length ? hits[i + 1]!.index : normalized.length;
    const body = normalized.slice(start, end);
    if (body.trim().length < 40) continue;
    const meta = peekEpicEncounterDetailMeta(body);
    sessions.push({
      index: sessions.length,
      startIndex: start,
      body,
      ...meta,
    });
  }
  return sessions;
}

function collapseHeaderLine(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Pull Date / Type / Department / Care Team from the top of an Encounter Details block. */
export function peekEpicEncounterDetailMeta(body: string): {
  dateRaw?: string;
  visitType?: string;
  department?: string;
  careTeamRaw?: string;
} {
  const head = body.slice(0, 3500);
  const dateRaw =
    head.match(
      /\bDate\s*[:：]\s*(\d{1,2}\/\d{1,2}\/\d{4}(?:\s*,?\s*\d{1,2}:\d{2}\s*[AP]M(?:\s*[A-Z]{2,4})?)?)/i
    )?.[1] ??
    head.match(
      /\b(\d{1,2}\/\d{1,2}\/\d{4}\s*,?\s*\d{1,2}:\d{2}\s*[AP]M(?:\s*[A-Z]{2,4})?)\b/
    )?.[1];
  const visitType = head.match(
    /\bType\s*[:：]\s*(Comprehensive Visit|Office Visit|Hospital Encounter|Telemedicine|Infusion|Documentation|Clinical Communication|Follow-?up|[A-Za-z][A-Za-z /-]{2,40})/i
  )?.[1];
  // One-line fields (address lines may follow before the next labeled field)
  const department = head.match(/\bDepartment\s*[:：]\s*([^\n]{5,200})/i)?.[1];
  const careTeamRaw = head.match(/\bCare Team\s*[:：]\s*([^\n]{3,200})/i)?.[1];
  return {
    dateRaw: dateRaw?.replace(/\s+/g, ' ').trim(),
    visitType: visitType?.replace(/\s+/g, ' ').trim(),
    department: department?.replace(/\s+/g, ' ').trim().slice(0, 200),
    careTeamRaw: careTeamRaw?.replace(/\s+/g, ' ').trim().slice(0, 200),
  };
}

/**
 * Subsection titles that appear under Encounter Details
 * (`… - documented as of this encounter`).
 */
export const EPIC_ENCOUNTER_LOCAL_SECTION_TITLES = [
  'Allergies',
  'Medications',
  'Ended Medications',
  'Active Problems',
  'Immunizations',
  'Social History',
  'Last Filed Vital Signs',
  'Progress Notes',
  'Functional Status',
  'Consult Notes',
  'Medications at Time of Discharge',
  'Plan of Treatment',
  'Procedures',
  'Results',
  'Visit Diagnoses',
] as const;

/**
 * Slice a nested “documented as of this encounter” subsection from one Encounter Details body.
 */
export function sliceEpicEncounterLocalSection(
  encounterBody: string,
  sectionTitle: string
): string {
  const esc = sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const startRe = new RegExp(
    `${esc}\\s*-\\s*documented as of this encounter(?:\\s*\\([^)]*\\))?`,
    'i'
  );
  const m = encounterBody.match(startRe);
  if (!m || m.index == null) return '';
  const rest = encounterBody.slice(m.index);
  const nextTitles = EPIC_ENCOUNTER_LOCAL_SECTION_TITLES.filter(
    (t) => t.toLowerCase() !== sectionTitle.toLowerCase()
  )
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|');
  const endRe = new RegExp(
    `(?=\\n\\s*(?:${nextTitles})\\s*-\\s*documented as of this encounter\\b|\\n\\s*Encounter Details\\b|$)`,
    'i'
  );
  const end = rest.slice(m[0].length).search(endRe);
  return end >= 0 ? rest.slice(0, m[0].length + end) : rest.slice(0, Math.min(rest.length, 40_000));
}

/**
 * Split a full Epic extract into clinical sessions.
 * Prefers Encounter Details hits (visit-level); falls back to cover banners / as-of markers.
 */
export function splitEpicMyHealthSummarySessions(text: string): string[] {
  const normalized = text.replace(/\r\n/g, '\n');
  if (!normalized.trim()) return [];

  const encounterSessions = sliceEpicEncounterDetailSessions(normalized);
  if (encounterSessions.length >= 2) {
    // Keep a short cover prefix (before first Encounter Details) + each encounter body
    const coverEnd = encounterSessions[0]!.startIndex;
    const out: string[] = [];
    if (coverEnd > 200) out.push(normalized.slice(0, coverEnd));
    for (const s of encounterSessions) out.push(s.body);
    return out;
  }

  const startIndexes: number[] = [0];
  for (const re of EPIC_INTAKE_START_PATTERNS) {
    const flags = re.flags.includes('g') ? re.flags : `${re.flags}g`;
    const global = new RegExp(re.source, flags);
    let m: RegExpExecArray | null;
    while ((m = global.exec(normalized)) !== null) {
      if (m.index > 200) startIndexes.push(m.index);
    }
  }

  const asOfRe =
    /(?:^|\n)\s*(?:Patient Demographics|Allergies|Medications|Active Problems|Results)\s*-\s*as of\s+\d{1,2}\/\d{1,2}\/\d{4}/gi;
  let m: RegExpExecArray | null;
  while ((m = asOfRe.exec(normalized)) !== null) {
    if (m.index > 50_000) startIndexes.push(m.index);
  }

  const uniq = [...new Set(startIndexes)].sort((a, b) => a - b);
  const sessions: string[] = [];
  for (let i = 0; i < uniq.length; i++) {
    const start = uniq[i]!;
    const end = i + 1 < uniq.length ? uniq[i + 1]! : normalized.length;
    if (end - start < 80) continue;
    sessions.push(normalized.slice(start, end));
  }
  return sessions.length > 0 ? sessions : [normalized];
}

/** Slice every `Results - as of DATE` block (multi-session Results). */
export function sliceAllEpicResultsSessions(text: string): { asOf: string; body: string }[] {
  const re = /Results\s*-\s*as of\s+(\d{1,2}\/\d{1,2}\/\d{4})/gi;
  const hits: { index: number; asOf: string; len: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    hits.push({ index: m.index, asOf: m[1]!, len: m[0].length });
  }
  if (hits.length === 0) {
    const fallback = text.match(/Results\b([\s\S]{0,120000})/i);
    return fallback ? [{ asOf: '', body: fallback[1] ?? fallback[0] }] : [];
  }
  const out: { asOf: string; body: string }[] = [];
  for (let i = 0; i < hits.length; i++) {
    const start = hits[i]!.index;
    const end = i + 1 < hits.length ? hits[i + 1]!.index : Math.min(text.length, start + 200_000);
    out.push({ asOf: hits[i]!.asOf, body: text.slice(start, end) });
  }
  return out;
}

/**
 * Results extraction playbook (Jane Doe / Mayo Continuity):
 * 1. Split PDF into clinical sessions (intake banner / Patient Health Summary repeat).
 * 2. Inside each session, collect every `Results - as of DATE` block.
 * 3. Within a block, split panels on:
 *    - `TEST NAME - Final result (DATE…)` / `Edited Result - Final`
 *    - `(ABNORMAL)` prefix / red-flag wording
 *    - repeating column headers (Component / Value / Reference / Flag)
 *    - blank-line or address-block separators (performing org) between panels
 * 4. Prefer table columns over free text; keep abnormal flags on each component.
 * 5. Cap panels per session then merge — do not treat the whole 500-page Results dump as one blob.
 */
export const EPIC_RESULTS_PARSE_PLAYBOOK = [
  'Apply Encounters pattern to EVERY TOC section: collect all as-of + encounter-local inventories (image titles are unreliable).',
  'Never truncate Mayo extracts mid-document — later Section - as of blocks are the text-layer source of truth.',
  'Session-split on repeated Encounter Details headers (visit boundaries) and Encounters - as of table.',
  'Each Encounter Details block owns nested “… - documented as of this encounter” subsections.',
  'Then slice each Results - as of DATE block (global and/or encounter-local).',
  'Panel boundaries: Final result (DATE), Edited Result - Final, (ABNORMAL).',
  'Column headers restart a table (Component Name, Value, Reference Range, Flag).',
  'Performing Organization / address blocks separate lab groups.',
  'Route imaging (MR/CT/XR/US/OCT) to imagingResults; labs keep components.',
] as const;


// ---------------------------------------------------------------------------
// Generalized TOC section indexer (Encounter Details–style search for ALL titles)
// ---------------------------------------------------------------------------

export type EpicSectionHitKind = 'plain' | 'asOf' | 'encounterLocal';

export type EpicSectionHit = {
  /** Canonical TOC title (e.g. Allergies, Encounter Details) */
  tocTitle: string;
  /** Tab14 section key */
  key: Tab14SectionKey;
  /** Exact header line matched in the extract */
  matchedTitle: string;
  kind: EpicSectionHitKind;
  /** Present when header was `… - as of MM/DD/YYYY` */
  asOf?: string;
  startIndex: number;
  endIndex: number;
  body: string;
};

/**
 * Aliases that are NOT section headers — table columns, field labels, panel markers.
 * Including them as PDF-search anchors would truncate bodies early (e.g. Allergies
 * ending at “Active Allergy Reactions”).
 */
const EPIC_TOC_NON_HEADER_ALIASES = new Set(
  [
    'note from ',
    'encounters',
    'notes',
    'discontinued',
    '(discontinued)',
    'demographics',
    'payers',
    'active allergy reactions',
    'final result',
    'edited result - final',
    'medication sigdispense',
    'care team', // singular field under Encounter Details; keep “Care Teams”
    'patient name',
    'patient address',
    'hospital encounter',
    'patient health summary', // cover banner, not a clinical section body
  ].map((s) => s.toLowerCase())
);

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Searchable titles for every established TOC row (canonical title + strong aliases),
 * longest first so “Medications at Time of Discharge” wins over “Medications”.
 */
export function epicTocSearchableTitles(): {
  tocTitle: string;
  key: Tab14SectionKey;
  searchTitle: string;
}[] {
  const rows: { tocTitle: string; key: Tab14SectionKey; searchTitle: string }[] = [];
  const seen = new Set<string>();
  for (const entry of EPIC_MY_HEALTH_SUMMARY_TOC) {
    const candidates = [entry.title, ...(entry.aliases ?? [])];
    for (const raw of candidates) {
      const searchTitle = raw.trim();
      if (searchTitle.length < 4) continue;
      if (EPIC_TOC_NON_HEADER_ALIASES.has(searchTitle.toLowerCase())) continue;
      const normalized = searchTitle
        .replace(/\s*-\s*as of\s*$/i, '')
        .replace(/\s*-\s*documented\s*$/i, '')
        .trim();
      if (normalized.length < 4) continue;
      if (EPIC_TOC_NON_HEADER_ALIASES.has(normalized.toLowerCase())) continue;
      const dedupe = `${entry.title}::${normalized.toLowerCase()}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      rows.push({ tocTitle: entry.title, key: entry.key, searchTitle: normalized });
    }
  }
  rows.sort((a, b) => b.searchTitle.length - a.searchTitle.length);
  return rows;
}

function classifyEpicSectionHeader(matchedLine: string): {
  kind: EpicSectionHitKind;
  asOf?: string;
} {
  const asOf = matchedLine.match(/\bas of\s+(\d{1,2}\/\d{1,2}\/\d{4})/i)?.[1];
  if (/documented as of this encounter/i.test(matchedLine)) {
    return { kind: 'encounterLocal', asOf };
  }
  if (asOf || /\s*-\s*as of\b/i.test(matchedLine)) {
    return { kind: 'asOf', asOf };
  }
  return { kind: 'plain' };
}

type EpicHeaderBoundary = {
  startIndex: number;
  searchTitle: string;
  tocTitle: string;
  key: Tab14SectionKey;
};

/** Header start offset — same formula as Encounter Details session slicing. */
function epicHeaderStartIndex(match: RegExpExecArray, searchTitle: string): number {
  const header = match[1] ?? match[2] ?? match[0];
  const rel = header.search(new RegExp(escapeRegExp(searchTitle), 'i'));
  return match.index + (match[0].length - header.length) + Math.max(0, rel);
}

/**
 * Epic Continuity text often glues the next section onto the previous line
 * (`…Ph.D. Allergies - as of 08/07/2026`). PDF Find still sees the title; line-start
 * regexes miss it. Allow mid-line headers when followed by `- as of` / `- documented`.
 */
export function epicSectionHeaderRegex(searchTitle: string, captureRestOfLine: boolean): RegExp {
  const title = escapeRegExp(searchTitle);
  // Double-escape: template literals would eat `\s` / `\b` before RegExp sees them.
  const rest = captureRestOfLine ? '[^\\n]*' : '';
  return new RegExp(
    `(?:(?:^|\\n)([ \\t]*${title}\\b${rest})|(?<=[^A-Za-z\\n])(${title}\\s*-\\s*(?:as of|documented)\\b${rest}))`,
    'gi'
  );
}

/** All TOC header start offsets in document order (longest-title wins at same offset). */
function collectEpicTocHeaderBoundaries(text: string): EpicHeaderBoundary[] {
  const boundaries: EpicHeaderBoundary[] = [];
  for (const target of epicTocSearchableTitles()) {
    const re = epicSectionHeaderRegex(target.searchTitle, false);
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const start = epicHeaderStartIndex(m, target.searchTitle);
      const existing = boundaries.find((b) => Math.abs(b.startIndex - start) < 4);
      if (existing) {
        if (target.searchTitle.length > existing.searchTitle.length) {
          existing.startIndex = start;
          existing.searchTitle = target.searchTitle;
          existing.tocTitle = target.tocTitle;
          existing.key = target.key;
        }
        continue;
      }
      boundaries.push({
        startIndex: start,
        searchTitle: target.searchTitle,
        tocTitle: target.tocTitle,
        key: target.key,
      });
    }
  }
  boundaries.sort((a, b) => a.startIndex - b.startIndex);
  return boundaries;
}

/**
 * Find every occurrence of one TOC section (by canonical title or Tab14 key),
 * same spirit as PDF-searching “Encounter Details”.
 * Body runs until the next known TOC section header.
 */
export function findEpicSectionHits(
  text: string,
  sectionTitleOrKey: string
): EpicSectionHit[] {
  const normalized = text.replace(/\r\n/g, '\n');
  const needle = sectionTitleOrKey.trim().toLowerCase();
  // Prefer canonical title matches; also allow exact searchTitle / key lookup.
  // Do not fan out to every alias (table headers were aliases and over-hit).
  const targets = epicTocSearchableTitles().filter((t) => {
    if (t.tocTitle.toLowerCase() === needle || t.key.toLowerCase() === needle) {
      return t.searchTitle.toLowerCase() === t.tocTitle.toLowerCase();
    }
    return t.searchTitle.toLowerCase() === needle;
  });
  if (targets.length === 0) return [];

  const allBoundaries = collectEpicTocHeaderBoundaries(normalized);
  const hits: EpicSectionHit[] = [];

  for (const target of targets) {
    const re = epicSectionHeaderRegex(target.searchTitle, true);
    let m: RegExpExecArray | null;
    while ((m = re.exec(normalized)) !== null) {
      const header = m[1] ?? m[2] ?? m[0];
      const line = header.replace(/^\s+/, '');
      const start = epicHeaderStartIndex(m, target.searchTitle);

      if (
        allBoundaries.some(
          (b) =>
            Math.abs(b.startIndex - start) < 4 &&
            b.searchTitle.length > target.searchTitle.length
        )
      ) {
        continue;
      }
      if (hits.some((h) => Math.abs(h.startIndex - start) < 8)) continue;

      const next = allBoundaries.find((b) => b.startIndex > start + 2);
      const end = next ? next.startIndex : normalized.length;
      if (end - start < 12) continue;
      const body = normalized.slice(start, end);
      const { kind, asOf } = classifyEpicSectionHeader(line);
      hits.push({
        tocTitle: target.tocTitle,
        key: target.key,
        matchedTitle: line.trim().slice(0, 160),
        kind,
        asOf,
        startIndex: start,
        endIndex: end,
        body,
      });
    }
  }

  hits.sort((a, b) => a.startIndex - b.startIndex);
  return hits;
}

/**
 * Index the whole extract: every established TOC section → all hits
 * (plain / as-of / encounter-local). Generalized “search every section title”.
 */
export function indexEpicTocSections(text: string): Record<string, EpicSectionHit[]> {
  const normalized = text.replace(/\r\n/g, '\n');
  const out: Record<string, EpicSectionHit[]> = {};
  for (const entry of EPIC_MY_HEALTH_SUMMARY_TOC) {
    out[entry.title] = findEpicSectionHits(normalized, entry.title);
  }
  return out;
}

/** Count hits per TOC title (debug/UI: “Allergies × 12, Encounter Details × 40”). */
export function countEpicTocSectionHits(text: string): Record<string, number> {
  const index = indexEpicTocSections(text);
  const counts: Record<string, number> = {};
  for (const [title, hits] of Object.entries(index)) {
    counts[title] = hits.length;
  }
  return counts;
}

/**
 * Prefer the best body for a section when many hits exist:
 * 1) global `… - as of DATE` (last hit)
 * 2) else first plain header
 * 3) else first encounter-local hit
 * Plus all encounter-local bodies (capped) for per-visit review.
 */
export function pickEpicSectionBodies(
  text: string,
  sectionTitleOrKey: string,
  opts?: { maxEncounterLocal?: number }
): { primary: string; encounterLocal: string[]; hitCount: number } {
  const hits = findEpicSectionHits(text, sectionTitleOrKey);
  if (hits.length === 0) return { primary: '', encounterLocal: [], hitCount: 0 };

  const asOfHits = hits.filter((h) => h.kind === 'asOf');
  const plainHits = hits.filter((h) => h.kind === 'plain');
  const localHits = hits.filter((h) => h.kind === 'encounterLocal');

  let primary = '';
  if (asOfHits.length > 0) primary = asOfHits[asOfHits.length - 1]!.body;
  else if (plainHits.length > 0) primary = plainHits[0]!.body;
  else if (localHits.length > 0) primary = localHits[0]!.body;

  const maxLocal = opts?.maxEncounterLocal ?? 40;
  return {
    primary,
    encounterLocal: localHits.slice(0, maxLocal).map((h) => h.body),
    hitCount: hits.length,
  };
}

/**
 * Encounters-style corpus for ANY TOC section: gather every useful hit body.
 * Prefer all `Section - as of DATE` inventories; also fold encounter-local copies
 * (yellow section titles are often image-only — locals / as-of are the text layer).
 */
export function collectEpicSectionBodies(
  text: string,
  sectionTitleOrKey: string,
  opts?: {
    maxAsOf?: number;
    maxPlain?: number;
    maxEncounterLocal?: number;
    /** When true (default), append encounter-local bodies even if as-of exists. */
    includeEncounterLocal?: boolean;
  }
): string[] {
  const hits = findEpicSectionHits(text, sectionTitleOrKey);
  const asOf = hits.filter((h) => h.kind === 'asOf');
  const plain = hits.filter((h) => h.kind === 'plain');
  const local = hits.filter((h) => h.kind === 'encounterLocal');

  const out: string[] = [];
  const seen = new Set<string>();
  const push = (body: string) => {
    const trimmed = body.trim();
    if (trimmed.length < 12) return;
    const key = trimmed.slice(0, 160).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(trimmed);
  };

  const maxAsOf = opts?.maxAsOf ?? 20;
  // Keep chronological inventories; prefer latest window when there are many.
  for (const h of asOf.slice(-maxAsOf)) push(h.body);

  if (out.length === 0) {
    for (const h of plain.slice(0, opts?.maxPlain ?? 8)) push(h.body);
  }

  const includeLocal = opts?.includeEncounterLocal !== false;
  if (includeLocal) {
    const maxLocal = opts?.maxEncounterLocal ?? (asOf.length > 0 ? 15 : 30);
    for (const h of local.slice(0, maxLocal)) push(h.body);
  }

  return out;
}
