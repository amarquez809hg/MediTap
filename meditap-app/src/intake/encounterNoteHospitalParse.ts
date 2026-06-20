import { tryParseDateToIso } from './intakeDateParse';
import type { Tab14HospitalFields } from './tab14IntakeTypes';

function collapseWs(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

export type EncounterNoteMatch = {
  visitDate: string;
  facilityName: string;
  reason: string;
};

/** Parse ISO-date encounter note blocks (Riverbend / Athena-style exports). */
export function matchEncounterNotes(text: string): EncounterNoteMatch[] {
  const rows: EncounterNoteMatch[] = [];

  const withChief = [
    ...text.matchAll(
      /Date:\s*(\d{4}-\d{2}-\d{2})\s+Facility:\s*(.+?)\s+Chief Complaint:\s*(.+?)\.\s+Subjective:/gi
    ),
  ];
  for (const match of withChief) {
    rows.push({
      visitDate: match[1],
      facilityName: collapseWs(match[2]),
      reason: collapseWs(match[3]),
    });
  }

  if (rows.length === 0) {
    const fallback = [
      ...text.matchAll(
        /Date:\s*(\d{4}-\d{2}-\d{2})\s+Facility:\s*(.+?)\s+Chief Complaint:\s*(.+?)(?=\s+Subjective:|\s+ENCOUNTER NOTE|\s+Order\s|$)/gi
      ),
    ];
    for (const match of fallback) {
      rows.push({
        visitDate: match[1],
        facilityName: collapseWs(match[2]),
        reason: collapseWs(match[3]).replace(/\.$/, ''),
      });
    }
  }

  if (rows.length === 0) {
    const partial = [
      ...text.matchAll(
        /ENCOUNTER NOTE\s+\d+\s*Date:\s*(\d{4}-\d{2}-\d{2})\s+Facility:\s*(.+?)(?=\s+ENCOUNTER NOTE|\s+Date:\s*\d{4}-\d{2}-\d{2}\s+Facility:|$)/gi
      ),
    ];
    for (const match of partial) {
      rows.push({
        visitDate: match[1],
        facilityName: collapseWs(match[2]),
        reason: '',
      });
    }
  }

  const athenaStyle = [
    ...text.matchAll(
      /(\d{1,2}\/\d{1,2}\/\d{4})\s*[-]\s*([^\n]+?)(?=\s+\d{1,2}\/\d{1,2}\/\d{4}\s*[-]|$)/g
    ),
  ];
  for (const match of athenaStyle) {
    const iso = tryParseDateToIso(match[1]);
    if (!iso) continue;
    rows.push({
      visitDate: iso,
      facilityName: '',
      reason: collapseWs(match[2]),
    });
  }

  return rows;
}

function inferVisitType(reason: string): string {
  if (/wellness|annual\s+physical/i.test(reason)) return 'Annual wellness';
  if (/follow-?up/i.test(reason)) return 'Follow-up';
  if (/urgent/i.test(reason)) return 'Urgent care';
  return 'Outpatient visit';
}

/** Pick the most recent encounter note as a single hospital-visit object. */
export function latestEncounterNoteHospitalVisit(text: string): Tab14HospitalFields {
  const rows = matchEncounterNotes(text);
  if (!rows.length) return {};

  const latest = rows.reduce((best, row) =>
    row.visitDate >= best.visitDate ? row : best
  );

  return {
    visitDate: latest.visitDate,
    facilityName: latest.facilityName,
    reason: latest.reason,
    visitType: inferVisitType(latest.reason),
  };
}
