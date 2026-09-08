/**
 * Generic Epic My Health Summary multi-hit section inventory.
 *
 * PDF Find often returns dozens of hits per TOC title (global `… - as of` +
 * per-visit “documented as of this encounter” reprints). Yellow titles are
 * frequently image-only, so text recovery may under-count — sparse sections
 * pad with cover + Encounters visit dates (same strategy as Demographics / Note).
 *
 * Specialty UIs (Patient Demographics, Note from Clinic) keep their own modules;
 * every other Epic sidebar section uses this shared occurrence model + panel.
 */

import { tryParseDateToIso } from './intakeDateParse';
import {
  extractEpicDemographicsIntakeTimeline,
  formatEpicDemoIntakeDateLabel,
  type EpicDemographicsIntakeTimeline,
} from './epicPatientDemographics';
import {
  EPIC_MY_HEALTH_SUMMARY_TOC,
  EPIC_SIDEBAR_LABELS,
  epicMyHealthSummarySidebarKeys,
  findEpicSectionHits,
  type EpicSectionHit,
} from './epicMyHealthSummaryToc';
import type { Tab14SectionKey } from './tab14PortabilitySections';

export const EPIC_SECTION_OCCURRENCE_BATCH_SIZE = 10;

/** Sections that commonly reprint once per visit when headers are image-only. */
const SPARSE_REPRINT_TITLES = new Set(
  [
    'Allergies',
    'Medications',
    'Active Problems',
    'Immunizations',
    'Social History',
    'Last Filed Vital Signs',
    'Plan of Treatment',
    'Procedures',
    'Results',
    'Progress Notes',
    'Functional Status',
    'Consult Notes',
    'Visit Diagnoses',
    'Insurance',
    'Care Teams',
    'Patient Contacts',
    'Reason for Referral',
  ].map((t) => t.toLowerCase())
);

export type EpicSectionOccurrence = {
  index: number;
  ordinal: number;
  total: number;
  label: string;
  tocTitle: string;
  sectionKey: Tab14SectionKey;
  source: 'asOf' | 'plain' | 'encounterLocal' | 'inferredReprint';
  intakeDateIso: string;
  intakeDateLabel: string;
  intakeDateKind: 'generated' | 'encounter' | 'asOf' | 'unknown';
  visitType: string;
  /** Raw section body for this Find hit (may be reused on inferred reprints). */
  body: string;
  /** Short bullets for collapsed/expanded cards (e.g. allergen names). */
  previewLines: string[];
};

function collapseWs(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function resolveHitDate(
  index: number,
  hit: EpicSectionHit | undefined,
  source: EpicSectionOccurrence['source'],
  timeline: EpicDemographicsIntakeTimeline
): Pick<
  EpicSectionOccurrence,
  'intakeDateIso' | 'intakeDateLabel' | 'intakeDateKind' | 'visitType'
> {
  if (hit?.asOf) {
    const m = hit.asOf.match(/(\d{1,2}\/\d{1,2}\/\d{4})/);
    const iso = m ? tryParseDateToIso(m[1]) || '' : '';
    if (iso) {
      return {
        intakeDateIso: iso,
        intakeDateLabel: formatEpicDemoIntakeDateLabel(iso),
        intakeDateKind: 'asOf',
        visitType: source === 'encounterLocal' ? 'Encounter-local snapshot' : 'Section as-of',
      };
    }
  }

  if (index === 0 && timeline.generatedOnIso && source !== 'asOf') {
    return {
      intakeDateIso: timeline.generatedOnIso,
      intakeDateLabel:
        timeline.generatedOnLabel || formatEpicDemoIntakeDateLabel(timeline.generatedOnIso),
      intakeDateKind: 'generated',
      visitType: 'Cover / primary snapshot',
    };
  }

  const visitIndex = index === 0 ? 0 : index - 1;
  const visit = timeline.visits[visitIndex];
  if (visit) {
    return {
      intakeDateIso: visit.dateIso,
      intakeDateLabel: visit.dateLabel,
      intakeDateKind: 'encounter',
      visitType: visit.visitType,
    };
  }

  if (timeline.generatedOnIso) {
    return {
      intakeDateIso: timeline.generatedOnIso,
      intakeDateLabel:
        timeline.generatedOnLabel || formatEpicDemoIntakeDateLabel(timeline.generatedOnIso),
      intakeDateKind: index === 0 ? 'generated' : 'unknown',
      visitType: index === 0 ? 'Cover / primary snapshot' : 'Visit reprint (date not listed)',
    };
  }

  return {
    intakeDateIso: '',
    intakeDateLabel: 'Date not on file',
    intakeDateKind: 'unknown',
    visitType: source === 'inferredReprint' ? 'Visit reprint' : 'Section snapshot',
  };
}

/** Build short preview lines from a section body (generic + allergy-aware). */
export function buildEpicSectionPreviewLines(tocTitle: string, body: string): string[] {
  const flat = collapseWs(body);
  if (!flat) return [];
  if (/No known active allergies/i.test(flat) && flat.length < 160) {
    return ['No known active allergies'];
  }
  if (/Not on file/i.test(flat) && flat.length < 120) {
    return ['Not on file'];
  }

  if (/^Allergies$/i.test(tocTitle)) {
    const lines: string[] = [];
    const re =
      /\b([A-Z][A-Za-z0-9()/-]{2,40})\s+(Rash(?:\s*\([^)]*\))?|Hives|Anaphylaxis|Itching|Swelling|Nausea|Unknown|[A-Za-z]{3,24})\s+(Low|Medium|High|Mild|Moderate|Severe)?(?:\s*Criticality)?\s*(\d{1,2}\/\d{1,2}\/\d{4})/g;
    const junk =
      /^(Active|Allergy|Reactions|Criticality|Noted|Date|Comments|Allergen|Never|Birth|Sex|Identity|Orientation|Married|Female|Male|White|Hispanic|English|Spoken|Written|Patient|Address|Name|Language|Race|Ethnicity|Marital|Communication)$/i;
    for (const m of flat.matchAll(re)) {
      const name = collapseWs(m[1]);
      if (junk.test(name)) continue;
      const reaction = collapseWs(m[2]);
      if (/^(Low|Medium|High|Mild|Moderate|Severe|Criticality)$/i.test(reaction)) continue;
      lines.push(`${name} — ${reaction}`);
      if (lines.length >= 8) break;
    }
    return lines;
  }

  const rawLines = body
    .split(/\n+/)
    .map((l) => collapseWs(l))
    .filter((l) => l.length > 3 && l.length < 120)
    .filter((l) => !/^(Date|Type|Department|Care Team|Description|Status)\b/i.test(l));
  return rawLines.slice(0, 6);
}

export function buildEpicSectionOccurrenceList(
  text: string,
  tocTitle: string,
  sectionKey: Tab14SectionKey
): EpicSectionOccurrence[] {
  const timeline = extractEpicDemographicsIntakeTimeline(text);
  const hits = findEpicSectionHits(text, tocTitle);
  const primaryBody =
    hits.find((h) => h.kind === 'asOf')?.body ||
    hits.find((h) => h.kind === 'plain')?.body ||
    hits[0]?.body ||
    '';

  let total = hits.length;
  const useSparse =
    SPARSE_REPRINT_TITLES.has(tocTitle.toLowerCase()) &&
    (hits.length <= 1 || hits.length < timeline.visits.length);
  if (useSparse && (primaryBody || timeline.visits.length > 0 || hits.length > 0)) {
    const cover = primaryBody || hits.length > 0 ? 1 : 0;
    total = Math.max(total, cover + timeline.visits.length, hits.length, cover);
  }
  if (total <= 0 && primaryBody) total = 1;
  if (total <= 0) return [];

  const list: EpicSectionOccurrence[] = [];
  for (let i = 0; i < total; i += 1) {
    const hit = hits[i];
    const source: EpicSectionOccurrence['source'] = hit
      ? hit.kind === 'asOf'
        ? 'asOf'
        : hit.kind === 'encounterLocal'
          ? 'encounterLocal'
          : 'plain'
      : i === 0 && primaryBody
        ? 'asOf'
        : 'inferredReprint';
    const body = hit?.body || primaryBody;
    const dated = resolveHitDate(i, hit, source, timeline);
    const datePart = dated.intakeDateLabel || 'Date not on file';
    const previewLines = buildEpicSectionPreviewLines(tocTitle, body);
    list.push({
      index: i,
      ordinal: i + 1,
      total,
      label: `${tocTitle} · ${datePart}`,
      tocTitle,
      sectionKey,
      source,
      ...dated,
      body,
      previewLines,
    });
  }
  return list;
}

/**
 * Inventory every Epic sidebar section except Demographics / Note from Clinic
 * (those keep specialty occurrence modules).
 */
export function inventoryEpicSidebarSectionOccurrences(text: string): {
  byKey: Partial<Record<Tab14SectionKey, EpicSectionOccurrence[]>>;
  countsByTitle: Partial<Record<string, number>>;
} {
  const byKey: Partial<Record<Tab14SectionKey, EpicSectionOccurrence[]>> = {};
  const countsByTitle: Partial<Record<string, number>> = {};

  for (const key of epicMyHealthSummarySidebarKeys()) {
    if (key === 'demographics' || key === 'patientInstructions') continue;
    const title =
      EPIC_SIDEBAR_LABELS[key] ||
      EPIC_MY_HEALTH_SUMMARY_TOC.find((e) => e.key === key && e.sidebar !== false)?.title;
    if (!title) continue;
    const list = buildEpicSectionOccurrenceList(text, title, key);
    if (list.length === 0) continue;
    byKey[key] = list;
    countsByTitle[title] = list.length;
  }

  return { byKey, countsByTitle };
}

export function epicSectionOccurrenceSourceBadge(
  source: EpicSectionOccurrence['source']
): string | null {
  if (source === 'inferredReprint') return 'Visit reprint';
  if (source === 'asOf') return 'As of';
  if (source === 'encounterLocal') return 'Encounter local';
  if (source === 'plain') return 'Header';
  return null;
}

export function epicSectionOccurrenceDateKindLabel(
  kind: EpicSectionOccurrence['intakeDateKind']
): string {
  if (kind === 'generated') return 'Document generated';
  if (kind === 'encounter') return 'Encounter date';
  if (kind === 'asOf') return 'Section as-of';
  return 'Date unknown';
}
