/**
 * Epic My Health Summary — “Note from Mayo Clinic” (clinic name varies) multi-hit tracking.
 *
 * PDF Find often shows ~30+ “Note from …” hits (cover disclaimer + per-visit reprints).
 * Yellow/green section titles are frequently image/vector, so the text layer may have 0–1
 * literal headers. Recognition therefore combines:
 *   1) literal `Note from … This document contains information…` hits
 *   2) sparse proxy: cover signal + `Encounters - as of` visit count
 *
 * Each occurrence is dated like Patient Demographics (generated-on for cover;
 * encounter visit dates for reprints).
 */

import {
  extractEpicDemographicsIntakeTimeline,
  formatEpicDemoIntakeDateLabel,
  type EpicDemographicsIntakeTimeline,
} from './epicPatientDemographics';
import { emptyClinicalEntry, type Tab14ClinicalEntry } from './tab14PortabilitySections';

const NOTE_HEADER_RE =
  /Note from\s+([A-Za-z][A-Za-z0-9 .,&'-]{1,80}?)\s+(?=This document contains information)/gi;

const NOTE_BODY_RE =
  /Note from\s+([A-Za-z][A-Za-z0-9 .,&'-]{1,80}?)\s+(This document contains information that was shared with\s+(.+?)\.\s*It may not contain the entire record from\s+.+?\.)/i;

export type EpicNoteFromClinicFields = {
  clinicName: string;
  sharedWith: string;
  body: string;
};

export type EpicNoteFromClinicOccurrence = {
  index: number;
  ordinal: number;
  total: number;
  label: string;
  source: 'cover' | 'header' | 'inferredReprint';
  intakeDateIso: string;
  intakeDateLabel: string;
  intakeDateKind: 'generated' | 'encounter' | 'unknown';
  visitType: string;
  fields: EpicNoteFromClinicFields;
};

function collapseWs(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

export function hasEpicNoteFromClinicCoverSignal(text: string): boolean {
  return (
    /Note from\s+[A-Za-z]/i.test(text) ||
    /This document contains information that was shared with/i.test(text)
  );
}

export function findEpicNoteFromClinicLiteralHits(text: string): Array<{
  clinicName: string;
  startIndex: number;
}> {
  const normalized = text.replace(/\r\n/g, '\n');
  const hits: Array<{ clinicName: string; startIndex: number }> = [];
  const re = new RegExp(NOTE_HEADER_RE.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalized)) !== null) {
    const clinicName = collapseWs(m[1] || 'Clinic');
    const startIndex = m.index;
    if (hits.some((h) => Math.abs(h.startIndex - startIndex) < 12)) continue;
    hits.push({ clinicName, startIndex });
  }
  return hits;
}

export function parseEpicNoteFromClinic(text: string): EpicNoteFromClinicFields {
  const normalized = text.replace(/\r\n/g, '\n');
  const head = normalized.slice(0, Math.min(normalized.length, 40_000));
  const m = head.match(NOTE_BODY_RE) || normalized.match(NOTE_BODY_RE);
  if (m) {
    return {
      clinicName: collapseWs(m[1] || 'Mayo Clinic'),
      sharedWith: collapseWs(m[3] || ''),
      body: collapseWs(m[2] || ''),
    };
  }
  const looseClinic = head.match(/Note from\s+([A-Za-z][A-Za-z0-9 .,&'-]{1,80})/i)?.[1];
  const looseBody = head.match(
    /(This document contains information that was shared with[^.]+?\.\s*It may not contain the entire record from[^.]+?\.)/i
  )?.[1];
  return {
    clinicName: collapseWs(looseClinic || 'Mayo Clinic'),
    sharedWith: '',
    body: collapseWs(looseBody || ''),
  };
}

export function estimateEpicNoteFromClinicOccurrenceCount(text: string): number {
  const literal = findEpicNoteFromClinicLiteralHits(text).length;
  const cover = hasEpicNoteFromClinicCoverSignal(text) ? 1 : 0;
  const timeline = extractEpicDemographicsIntakeTimeline(text);
  const proxy = cover + timeline.visits.length;
  return Math.max(literal, proxy, cover);
}

function resolveNoteIntakeDate(
  index: number,
  source: EpicNoteFromClinicOccurrence['source'],
  timeline: EpicDemographicsIntakeTimeline
): Pick<
  EpicNoteFromClinicOccurrence,
  'intakeDateIso' | 'intakeDateLabel' | 'intakeDateKind' | 'visitType'
> {
  if (index === 0 && timeline.generatedOnIso) {
    return {
      intakeDateIso: timeline.generatedOnIso,
      intakeDateLabel:
        timeline.generatedOnLabel || formatEpicDemoIntakeDateLabel(timeline.generatedOnIso),
      intakeDateKind: 'generated',
      visitType: source === 'cover' ? 'Cover / summary of care' : 'Primary note',
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
      visitType:
        index === 0
          ? 'Cover / summary of care'
          : 'Visit reprint (date not listed)',
    };
  }

  return {
    intakeDateIso: '',
    intakeDateLabel: 'Date not on file',
    intakeDateKind: 'unknown',
    visitType: source === 'cover' ? 'Cover / summary of care' : 'Visit reprint',
  };
}

/**
 * One intake row per PDF-Find-style “Note from …” hit.
 * Cover fields are parsed once; later hits reuse the same disclaimer when headers are image-only.
 */
export function buildEpicNoteFromClinicOccurrenceList(
  text: string
): EpicNoteFromClinicOccurrence[] {
  const literalHits = findEpicNoteFromClinicLiteralHits(text);
  const primary = parseEpicNoteFromClinic(text);
  const total = Math.max(
    1,
    estimateEpicNoteFromClinicOccurrenceCount(text),
    literalHits.length
  );
  const timeline = extractEpicDemographicsIntakeTimeline(text);

  const list: EpicNoteFromClinicOccurrence[] = [];
  for (let i = 0; i < total; i += 1) {
    const hit = literalHits[i];
    const source: EpicNoteFromClinicOccurrence['source'] = hit
      ? i === 0
        ? 'cover'
        : 'header'
      : i === 0 && primary.body
        ? 'cover'
        : 'inferredReprint';
    const fields: EpicNoteFromClinicFields = hit
      ? {
          clinicName: hit.clinicName || primary.clinicName,
          sharedWith: primary.sharedWith,
          body: primary.body,
        }
      : { ...primary };
    const dated = resolveNoteIntakeDate(i, source, timeline);
    const datePart = dated.intakeDateLabel || 'Date not on file';
    list.push({
      index: i,
      ordinal: i + 1,
      total,
      label: `Note from ${fields.clinicName || 'Clinic'} · ${datePart}`,
      source,
      ...dated,
      fields,
    });
  }
  return list;
}

export function epicNoteOccurrenceToClinicalEntry(
  occ: EpicNoteFromClinicOccurrence
): Tab14ClinicalEntry {
  const clinic = occ.fields.clinicName || 'Clinic';
  return {
    ...emptyClinicalEntry(),
    title: `Note from ${clinic}`,
    detail: occ.fields.body || '',
    date: occ.intakeDateIso || '',
    place: clinic,
    recordedBy: occ.fields.sharedWith ? `Shared with ${occ.fields.sharedWith}` : '',
    notes: occ.visitType || '',
    noteType: occ.intakeDateKind === 'generated' ? 'Cover disclaimer' : 'Visit reprint',
    status: occ.source === 'inferredReprint' ? 'inferred' : 'parsed',
  };
}

export function inventoryEpicNoteFromClinic(text: string): {
  occurrenceCount: number;
  fields: EpicNoteFromClinicFields;
  occurrences: EpicNoteFromClinicOccurrence[];
  entries: Tab14ClinicalEntry[];
} {
  const occurrences = buildEpicNoteFromClinicOccurrenceList(text);
  const fields = parseEpicNoteFromClinic(text);
  const occurrenceCount = Math.max(
    estimateEpicNoteFromClinicOccurrenceCount(text),
    occurrences.length
  );
  const entries =
    occurrences.length > 0
      ? occurrences.map(epicNoteOccurrenceToClinicalEntry)
      : [
          {
            ...emptyClinicalEntry(),
            title: 'None recorded',
            detail: 'Not present in Epic My Health Summary snapshot.',
          },
        ];
  return { occurrenceCount, fields, occurrences, entries };
}
