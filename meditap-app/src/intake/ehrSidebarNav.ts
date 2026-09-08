/**
 * Per-EHR left-menu profiles for Tab14.
 *
 * After each PDF selector is locked, fill `EHR_SIDEBAR_SECTION_KEYS` with the
 * ordered section keys that match that export’s table of contents / cover titles.
 * Until then every vendor uses the full portability nav (`'all'`).
 */

import type { EhrDocumentTypeId } from './ehrDocumentTypes';
import type { Tab14NavSection, Tab14SectionKey } from './tab14PortabilitySections';
import { tab14NavLabel } from './tab14PortabilitySections';
import { buildTab14SidebarNav } from './tab14SidebarNav';
import {
  EPIC_SIDEBAR_LABELS,
  epicMyHealthSummarySidebarKeys,
} from './epicMyHealthSummaryToc';

/** Full default menu key order (reference when building per-vendor lists). */
export const EHR_SIDEBAR_ALL_SECTION_KEYS: Tab14SectionKey[] = [
  'demographics',
  'relatedPerson',
  'careTeamMembers',
  'assessment',
  'planOfTreatment',
  'patientInstructions',
  'reasonForReferral',
  'results',
  'problems',
  'procedures',
  'surgicalHistory',
  'imagingResults',
  'procedureNotes',
  'medicalEquipment',
  'allergies',
  'medications',
  'vitals',
  'socialHistory',
  'functionalStatus',
  'mentalStatus',
  'familyHistory',
  'medicalHistory',
  'obstetricsHistory',
  'immunizations',
  'pastEncounters',
  'goals',
  'healthConcerns',
  'advanceDirectives',
  'payers',
  'notes',
  'careTeam',
];

/**
 * Ordered left-menu keys per document-source selector.
 * Use `'all'` until you paste the tracked subtitle list for that EHR.
 *
 * MEDITECH = Jordan CCD Table of Contents (MyHealth Continuity of Care Document).
 * Epic = Jane Doe My Health Summary (Lucy/Mayo color sections; see epicMyHealthSummaryToc.ts).
 */
export const EHR_SIDEBAR_SECTION_KEYS: Record<
  Exclude<EhrDocumentTypeId, 'auto'>,
  Tab14SectionKey[] | 'all'
> = {
  athena: 'all',
  meditech: [
    'demographics',
    'relatedPerson',
    'careTeamMembers',
    'assessment',
    'planOfTreatment',
    'reasonForReferral',
    'results',
    'problems',
    'procedures',
    'medicalEquipment',
    'allergies',
    'medications',
    'vitals',
    'socialHistory',
    'functionalStatus',
    'mentalStatus',
    'familyHistory',
    'medicalHistory',
    'immunizations',
    'pastEncounters',
    'goals',
    'healthConcerns',
    'advanceDirectives',
    'payers',
    'notes',
    'careTeam',
  ],
  epic: epicMyHealthSummarySidebarKeys(),
  nextgen: 'all',
  /** Non-Athena/MEDITECH/Epic/NextGen PDFs — customize once you track titles. */
  generic: 'all',
};

export function resolveEhrSidebarSectionKeys(
  vendor: EhrDocumentTypeId | null | undefined
): Tab14SectionKey[] | 'all' {
  if (!vendor || vendor === 'auto') return 'all';
  return EHR_SIDEBAR_SECTION_KEYS[vendor] ?? 'all';
}

/** Display label for a sidebar row (vendor-specific titles when locked). */
export function ehrSidebarNavLabel(
  section: Tab14NavSection,
  vendor: EhrDocumentTypeId | null | undefined
): string {
  if (vendor === 'epic') {
    const epic = EPIC_SIDEBAR_LABELS[section.key];
    if (epic) return epic;
  }
  if (section.key === 'careTeamMembers') return 'Care Team Members';
  if (section.key === 'careTeam') return 'Care Team';
  return tab14NavLabel(section);
}

/** Sidebar nav for the selected EHR (or full menu before selection / Auto). */
export function buildTab14SidebarNavForEhr(
  vendor: EhrDocumentTypeId | null | undefined
): Tab14NavSection[] {
  const full = buildTab14SidebarNav();
  const keys = resolveEhrSidebarSectionKeys(vendor);
  if (keys === 'all') return full;

  const byKey = new Map(full.map((s) => [s.key, s]));
  const ordered: Tab14NavSection[] = [];
  for (const key of keys) {
    const row = byKey.get(key);
    if (row) ordered.push(row);
  }
  return ordered.length > 0 ? ordered : full;
}
