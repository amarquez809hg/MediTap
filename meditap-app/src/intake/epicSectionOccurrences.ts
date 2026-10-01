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
  sliceAllEpicResultsSessions,
  sliceEpicEncounterDetailSessions,
  type EpicSectionHit,
} from './epicMyHealthSummaryToc';
import {
  buildEpicImmunizationPreviewLines,
  parseEpicImmunizationShots,
  truncateEpicImmunizationsBody,
  type EpicImmunizationShot,
} from './epicImmunizations';
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
    'Encounter Details',
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
  /** Structured Immunization Name + Given Date rows (Immunizations only). */
  immunizationShots?: EpicImmunizationShot[];
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

  if (/^Encounter Details$/i.test(tocTitle)) {
    const lines: string[] = [];
    const visitType = flat.match(
      /\b(Comprehensive Visit|Office Visit|Hospital Encounter|Telemedicine|Infusion|Appointment|Procedure Visit)\b/i
    )?.[1];
    const dept = flat.match(/\bDepartment(?:\s+of)?\s+([A-Za-z][A-Za-z /&-]{3,80})/i)?.[1];
    const clinician = flat.match(
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z'.-]+)+),\s*(?:M\.D\.|APRN|C\.N\.P\.|D\.N\.P\.|Ph\.D\.)/
    )?.[0];
    if (visitType) lines.push(collapseWs(visitType));
    if (dept) lines.push(`Dept: ${collapseWs(dept).slice(0, 80)}`);
    if (clinician) lines.push(collapseWs(clinician).slice(0, 80));
    if (lines.length) return lines;
  }

  if (/^Results$/i.test(tocTitle)) {
    const lines: string[] = [];
    const panelRe =
      /([A-Z][A-Z0-9 ,/()-]{2,60}?)\s*-\s*(?:Final result|Edited Result\s*-\s*Final)\s*\(/gi;
    for (const m of body.matchAll(panelRe)) {
      const name = collapseWs(m[1] || '');
      if (!name || /^(Component|Value|Reference|Flag|Results)$/i.test(name)) continue;
      lines.push(name);
      if (lines.length >= 8) break;
    }
    if (lines.length) return lines;
  }

  if (/^Immunizations$/i.test(tocTitle)) {
    return buildEpicImmunizationPreviewLines(body, 8);
  }

  const rawLines = body
    .split(/\n+/)
    .map((l) => collapseWs(l))
    .filter((l) => l.length > 3 && l.length < 120)
    .filter((l) => !/^(Date|Type|Department|Care Team|Description|Status)\b/i.test(l));
  return rawLines.slice(0, 6);
}

function syntheticEncounterBody(visit: {
  dateIso: string;
  dateLabel: string;
  visitType: string;
}): string {
  return [
    'Encounter Details',
    `Date: ${visit.dateLabel || visit.dateIso || 'Date not on file'}`,
    `Type: ${visit.visitType || 'Encounter'}`,
    '',
    'Yellow “Encounter Details” titles are often image-only in this PDF export.',
    'This intake is dated from the Encounters — as of inventory (same list PDF Find uses for visit reprints).',
  ].join('\n');
}

/**
 * Encounter Details: prefer real session slices; when yellow titles are image-only,
 * expand to one intake per Encounters — as of visit (PDF Find ~30 on Jane Doe).
 */
export function buildEncounterDetailsOccurrenceList(
  text: string,
  sectionKey: Tab14SectionKey = 'pastEncounters'
): EpicSectionOccurrence[] {
  const tocTitle = 'Encounter Details';
  const timeline = extractEpicDemographicsIntakeTimeline(text);
  const sessions = sliceEpicEncounterDetailSessions(text);
  const visits = timeline.visits;
  const total = Math.max(sessions.length, visits.length);
  if (total <= 0) return [];

  const list: EpicSectionOccurrence[] = [];
  const useVisitDriven = visits.length >= sessions.length && visits.length > 0;

  for (let i = 0; i < total; i += 1) {
    const visit = visits[i];
    const session =
      sessions.find((s) => {
        if (!visit?.dateIso || !s.dateRaw) return false;
        const iso = tryParseDateToIso(s.dateRaw.split(',')[0]?.trim() ?? s.dateRaw);
        return iso === visit.dateIso;
      }) || sessions[i];

    let intakeDateIso = '';
    let intakeDateLabel = '';
    let intakeDateKind: EpicSectionOccurrence['intakeDateKind'] = 'unknown';
    let visitType = '';
    let source: EpicSectionOccurrence['source'] = 'inferredReprint';
    let body = '';

    if (useVisitDriven && visit) {
      intakeDateIso = visit.dateIso;
      intakeDateLabel = visit.dateLabel;
      intakeDateKind = 'encounter';
      visitType = visit.visitType;
      if (session) {
        source = 'plain';
        body = session.body;
        if (session.visitType) visitType = session.visitType;
      } else {
        source = 'inferredReprint';
        body = syntheticEncounterBody(visit);
      }
    } else if (session) {
      source = 'plain';
      body = session.body;
      visitType = session.visitType || '';
      const iso = session.dateRaw
        ? tryParseDateToIso(session.dateRaw.split(',')[0]?.trim() ?? session.dateRaw) || ''
        : '';
      if (iso) {
        intakeDateIso = iso;
        intakeDateLabel = formatEpicDemoIntakeDateLabel(iso);
        intakeDateKind = 'encounter';
      } else if (visit) {
        intakeDateIso = visit.dateIso;
        intakeDateLabel = visit.dateLabel;
        intakeDateKind = 'encounter';
        visitType = visit.visitType || visitType;
      }
    } else if (visit) {
      source = 'inferredReprint';
      body = syntheticEncounterBody(visit);
      intakeDateIso = visit.dateIso;
      intakeDateLabel = visit.dateLabel;
      intakeDateKind = 'encounter';
      visitType = visit.visitType;
    }

    if (!intakeDateLabel) {
      intakeDateLabel = 'Date not on file';
    }

    const previewLines = buildEpicSectionPreviewLines(tocTitle, body);
    if (visitType && !previewLines.some((l) => l.toLowerCase().includes(visitType.toLowerCase()))) {
      previewLines.unshift(visitType);
    }

    list.push({
      index: i,
      ordinal: i + 1,
      total,
      label: `${tocTitle} · ${intakeDateLabel}`,
      tocTitle,
      sectionKey,
      source,
      intakeDateIso,
      intakeDateLabel,
      intakeDateKind,
      visitType,
      body,
      previewLines: previewLines.slice(0, 8),
    });
  }
  return list;
}

/**
 * Results: each `Results - as of` block + encounter-local Results hits;
 * pad with visit dates when yellow headers leave the text layer sparse.
 */
export function buildResultsOccurrenceList(
  text: string,
  sectionKey: Tab14SectionKey = 'results'
): EpicSectionOccurrence[] {
  const tocTitle = 'Results';
  const timeline = extractEpicDemographicsIntakeTimeline(text);
  const asOfSessions = sliceAllEpicResultsSessions(text).filter((s) => s.body.trim().length > 40);
  const hits = findEpicSectionHits(text, 'Results');
  const primaryBody =
    asOfSessions[0]?.body ||
    hits.find((h) => h.kind === 'asOf')?.body ||
    hits[0]?.body ||
    '';

  type Seed = {
    body: string;
    asOf?: string;
    hit?: EpicSectionHit;
    source: EpicSectionOccurrence['source'];
  };
  const seeds: Seed[] = [];
  const seen = new Set<string>();
  const pushSeed = (seed: Seed) => {
    const key = seed.body.slice(0, 160).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    seeds.push(seed);
  };

  for (const s of asOfSessions) {
    pushSeed({ body: s.body, asOf: s.asOf, source: 'asOf' });
  }
  for (const h of hits) {
    if (h.kind === 'asOf' && asOfSessions.length > 0) continue;
    pushSeed({
      body: h.body,
      asOf: h.asOf,
      hit: h,
      source:
        h.kind === 'asOf' ? 'asOf' : h.kind === 'encounterLocal' ? 'encounterLocal' : 'plain',
    });
  }

  let total = seeds.length;
  if (total <= 1 && timeline.visits.length > 1) {
    total = Math.max(total, timeline.visits.length);
  }
  if (total <= 0 && primaryBody) total = 1;
  if (total <= 0) return [];

  const list: EpicSectionOccurrence[] = [];
  for (let i = 0; i < total; i += 1) {
    const seed = seeds[i];
    const visit = timeline.visits[i];
    const body = seed?.body || primaryBody;
    const source: EpicSectionOccurrence['source'] = seed?.source || 'inferredReprint';
    let dated: Pick<
      EpicSectionOccurrence,
      'intakeDateIso' | 'intakeDateLabel' | 'intakeDateKind' | 'visitType'
    >;
    if (seed?.asOf) {
      const iso = tryParseDateToIso(seed.asOf) || '';
      dated = {
        intakeDateIso: iso,
        intakeDateLabel: iso ? formatEpicDemoIntakeDateLabel(iso) : seed.asOf,
        intakeDateKind: 'asOf',
        visitType: 'Results as-of',
      };
    } else if (seed?.hit) {
      dated = resolveHitDate(i, seed.hit, source, timeline);
    } else if (visit) {
      dated = {
        intakeDateIso: visit.dateIso,
        intakeDateLabel: visit.dateLabel,
        intakeDateKind: 'encounter',
        visitType: visit.visitType,
      };
    } else {
      dated = resolveHitDate(i, undefined, source, timeline);
    }

    list.push({
      index: i,
      ordinal: i + 1,
      total,
      label: `${tocTitle} · ${dated.intakeDateLabel || 'Date not on file'}`,
      tocTitle,
      sectionKey,
      source,
      ...dated,
      body,
      previewLines: buildEpicSectionPreviewLines(tocTitle, body),
    });
  }
  return list;
}

export function buildEpicSectionOccurrenceList(
  text: string,
  tocTitle: string,
  sectionKey: Tab14SectionKey
): EpicSectionOccurrence[] {
  if (sectionKey === 'pastEncounters' || /^Encounter Details$/i.test(tocTitle)) {
    return buildEncounterDetailsOccurrenceList(text, 'pastEncounters');
  }
  if (sectionKey === 'results' || /^Results$/i.test(tocTitle)) {
    return buildResultsOccurrenceList(text, 'results');
  }
  if (sectionKey === 'immunizations' || /^Immunizations$/i.test(tocTitle)) {
    return buildImmunizationsOccurrenceList(text, 'immunizations');
  }

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
 * Immunizations: truncate Social History bleed, parse Name + Given Date,
 * and expand sparse yellow-title reprints from the Encounters visit inventory
 * (same spirit as PDF Find ~30 section hits on Jane Doe).
 */
export function buildImmunizationsOccurrenceList(
  text: string,
  sectionKey: Tab14SectionKey = 'immunizations'
): EpicSectionOccurrence[] {
  const tocTitle = 'Immunizations';
  const timeline = extractEpicDemographicsIntakeTimeline(text);
  const hits = findEpicSectionHits(text, tocTitle).map((h) => ({
    ...h,
    body: truncateEpicImmunizationsBody(h.body),
  }));

  const coverFallback = truncateEpicImmunizationsBody(
    text.match(/Immunizations\b[\s\S]{0,3500}?(?=Social History\b|Procedures\b|Results\b|$)/i)?.[0] ??
      ''
  );

  const bodies = [
    ...hits.map((h) => h.body),
    coverFallback,
  ].filter((b) => b.trim().length > 0);

  let primaryBody = '';
  let primaryShots: EpicImmunizationShot[] = [];
  for (const body of bodies) {
    const shots = parseEpicImmunizationShots(body);
    if (shots.length > primaryShots.length) {
      primaryShots = shots;
      primaryBody = body;
    }
  }
  if (!primaryBody) {
    primaryBody = hits[0]?.body || coverFallback;
    primaryShots = parseEpicImmunizationShots(primaryBody);
  }

  let total = hits.length;
  if (hits.length <= 2 || hits.length < timeline.visits.length) {
    const cover = primaryBody || hits.length > 0 ? 1 : 0;
    // Cover (generated-on) + each Encounters — as of visit ≈ PDF Find section reprints.
    total = Math.max(
      total,
      cover + timeline.visits.length,
      (timeline.generatedOnIso ? 1 : 0) + timeline.visits.length,
      hits.length
    );
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
        ? 'plain'
        : 'inferredReprint';
    const body = truncateEpicImmunizationsBody(hit?.body || primaryBody);
    const shots = parseEpicImmunizationShots(body);
    const immunizationShots = shots.length > 0 ? shots : primaryShots;
    const dated = resolveHitDate(i, hit, source, timeline);
    const datePart = dated.intakeDateLabel || 'Date not on file';
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
      previewLines: immunizationShots
        .slice(0, 8)
        .map((s) => `${s.name} — ${s.givenDate}`),
      immunizationShots,
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
