/**
 * Bridge Tab14 lab panels (API / Tab7) ↔ extended Results clinical cards.
 */

import type { LabResultRow } from '../labResults/labResultModel';
import type { Tab14LabPanel, Tab14LabPanelCategory } from './tab14IntakeTypes';
import type { Tab14ClinicalEntry } from './tab14PortabilitySections';
import { emptyClinicalEntry } from './tab14PortabilitySections';

function collapseWs(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function formatComponentLine(c: {
  name: string;
  value?: number;
  textValue?: string;
  unit?: string;
  range?: string;
  interpretation?: string;
  critical?: boolean;
}): string {
  const value =
    c.value !== undefined && c.value !== null && Number.isFinite(c.value)
      ? String(c.value)
      : collapseWs(c.textValue ?? '');
  const bits = [collapseWs(c.name) || 'Result', value || '—'];
  if (c.unit?.trim()) bits.push(c.unit.trim());
  if (c.range?.trim()) bits.push(`[${c.range.trim()}]`);
  if (c.interpretation?.trim()) bits.push(c.interpretation.trim());
  if (c.critical) bits.push('FLAGGED');
  return bits.join(' ');
}

export function formatLabComponentsDetail(
  components: Array<{
    name: string;
    value?: number;
    textValue?: string;
    unit?: string;
    range?: string;
    interpretation?: string;
    critical?: boolean;
  }>
): string {
  return components
    .map(formatComponentLine)
    .filter((line) => line.replace(/\s/g, '').length > 0)
    .join('\n');
}

/** Tab14LabPanel (parse / snapshot) → Results clinical card. */
export function clinicalEntryFromTab14LabPanel(panel: Tab14LabPanel): Tab14ClinicalEntry {
  const componentDetail = formatLabComponentsDetail(panel.components ?? []);
  const detail =
    collapseWs(panel.impression ?? '') ||
    componentDetail ||
    collapseWs(panel.notes ?? '') ||
    collapseWs(panel.clinicalIndication ?? '');
  return {
    ...emptyClinicalEntry(),
    title: collapseWs(panel.testName) || collapseWs(panel.displayCode ?? '') || 'Results',
    date: panel.date || '',
    status: panel.status || '',
    category: panel.category || 'lab',
    code: panel.displayCode || '',
    detail,
    notes: panel.notes || '',
    recordedBy: panel.signedBy || '',
    place: panel.modality || '',
    time: '',
  };
}

export function clinicalEntriesFromTab14LabPanels(
  panels: Tab14LabPanel[] | null | undefined
): Tab14ClinicalEntry[] {
  return (panels ?? [])
    .map(clinicalEntryFromTab14LabPanel)
    .filter((e) => e.title.trim() || e.detail.trim() || e.date.trim());
}

/** LabResultRow (Tab14 form state) → Results clinical card. */
export function clinicalEntryFromLabResultRow(row: LabResultRow): Tab14ClinicalEntry {
  const componentDetail = formatLabComponentsDetail(row.results ?? []);
  const detail =
    collapseWs(row.impression ?? '') ||
    componentDetail ||
    collapseWs(row.notes ?? '') ||
    collapseWs(row.clinicalIndication ?? '');
  return {
    ...emptyClinicalEntry(),
    title: collapseWs(row.testName) || collapseWs(row.displayCode ?? '') || 'Results',
    date: row.date || '',
    status: row.status || '',
    category: row.category || 'lab',
    code: row.displayCode || '',
    detail,
    notes: row.notes || '',
    recordedBy: row.signedBy || '',
    place: row.modality || '',
    time: '',
  };
}

export function clinicalEntriesFromLabResultRows(
  rows: LabResultRow[] | null | undefined
): Tab14ClinicalEntry[] {
  return (rows ?? [])
    .map(clinicalEntryFromLabResultRow)
    .filter((e) => e.title.trim() || e.detail.trim() || e.date.trim());
}

/**
 * Extended Results cards → LabResultRow[] for API / Tab7.
 * Preserves prior component rows when title+date match; otherwise one summary component.
 */
export function labResultRowsFromClinicalEntries(
  entries: Tab14ClinicalEntry[],
  prior: LabResultRow[] = []
): LabResultRow[] {
  return entries.map((entry, index) => {
    const title = collapseWs(entry.title);
    const date = collapseWs(entry.date);
    const priorMatch =
      prior.find(
        (p) =>
          collapseWs(p.testName).toLowerCase() === title.toLowerCase() &&
          collapseWs(p.date) === date
      ) ?? prior[index];

    const categoryRaw = collapseWs(entry.category || priorMatch?.category || 'lab').toLowerCase();
    const category: Tab14LabPanelCategory =
      categoryRaw === 'imaging' || categoryRaw === 'clinical' || categoryRaw === 'lab'
        ? categoryRaw
        : 'lab';

    const detail = entry.detail.trim();
    const results =
      priorMatch?.results?.length && priorMatch.results.some((c) => collapseWs(c.name))
        ? priorMatch.results
        : [
            {
              name: 'Result',
              textValue: detail || '—',
              unit: '',
              range: '',
              critical: false,
            },
          ];

    return {
      id: priorMatch?.id ?? entry.code?.trim() ?? `PDF-${index + 1}`,
      serverId: priorMatch?.serverId,
      displayCode: entry.code?.trim() || priorMatch?.displayCode || null,
      testName: title || `Results ${index + 1}`,
      date,
      status: collapseWs(entry.status ?? '') || priorMatch?.status || 'Final',
      isNew: priorMatch?.isNew ?? false,
      category,
      notes: entry.notes?.trim() || priorMatch?.notes,
      impression: detail || priorMatch?.impression,
      clinicalIndication: priorMatch?.clinicalIndication,
      accessionNumber: priorMatch?.accessionNumber,
      modality: entry.place?.trim() || priorMatch?.modality,
      signedBy: entry.recordedBy?.trim() || priorMatch?.signedBy,
      results,
    };
  });
}
