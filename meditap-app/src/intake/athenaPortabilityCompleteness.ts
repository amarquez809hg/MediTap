/**
 * Athena Data Portability section completeness — training / regression signal.
 *
 * The left Tab14 menu is `TAB14_PORTABILITY_NAV` (Demographics → Notes).
 * This scorer emits **one row per left-menu item** in that same order.
 *
 * `AthenaPortabilityCompletenessInput` is only the *data bag* (where values live).
 * It is not the list of scored labels — see `scoreAthenaSidebarSections`.
 */

import type {
  Tab14AllergyRow,
  Tab14ChronicRow,
  Tab14HospitalFields,
  Tab14InsuranceRow,
  Tab14IntakeParseResult,
  Tab14LabPanel,
  Tab14MedicationRow,
  Tab14PatientFields,
  Tab14VitalReading,
} from './tab14IntakeTypes';
import type {
  Tab14ClinicalEntry,
  Tab14ExtendedSectionKey,
  Tab14ExtendedSections,
  Tab14NavSection,
} from './tab14PortabilitySections';
import {
  TAB14_EXTENDED_SECTION_KEYS,
  TAB14_PORTABILITY_NAV,
  tab14NavLabel,
} from './tab14PortabilitySections';

export type AthenaSectionStatus = 'filled' | 'none_recorded' | 'thin' | 'missing';

export type AthenaSectionScore = {
  /** Same key as left-menu `TAB14_PORTABILITY_NAV[].key` */
  id: string;
  /** Same label users see in the left menu */
  label: string;
  status: AthenaSectionStatus;
  count: number;
  detail: string;
};

export type AthenaPortabilityCompletenessResult = {
  /** 0–100 across all left-menu sections (equal weight). */
  scorePercent: number;
  filled: number;
  total: number;
  sections: AthenaSectionScore[];
  /** Human labels still missing or thin (training backlog). */
  gapLabels: string[];
};

/**
 * Parse / form data used to score the sidebar.
 * Not a section list — every left-menu label is scored via `TAB14_PORTABILITY_NAV`.
 */
export type AthenaPortabilityCompletenessInput = {
  patientFields: Tab14PatientFields;
  allergies: Tab14AllergyRow[];
  noKnownDrugAllergies?: boolean;
  medications: Tab14MedicationRow[];
  chronicConditions: Tab14ChronicRow[];
  noKnownProblems?: boolean;
  insurances: Tab14InsuranceRow[];
  labPanels: Tab14LabPanel[];
  vitalsHistory?: Tab14VitalReading[];
  hospitalVisits?: Tab14HospitalFields[];
  extendedSections?: Tab14ExtendedSections;
};

/** Left-menu keys in display order (Demographics … Notes). */
export const ATHENA_SIDEBAR_SECTION_KEYS: string[] = TAB14_PORTABILITY_NAV.map((s) => s.key);

function hasText(v: string | undefined | null): boolean {
  return Boolean(v && String(v).trim());
}

function isNoneTitle(title: string): boolean {
  return /^(none recorded|no\s+\w+\s+recorded|n\/?a)$/i.test(title.trim());
}

function isThinEntry(entry: Tab14ClinicalEntry): boolean {
  if (isNoneTitle(entry.title)) return true;
  const title = collapse(entry.title);
  if (title.length < 3) return true;
  // TOC bleed: "Goals · Health Concerns · Advance Directives ·"
  if (/·/.test(entry.detail || '') || /·/.test(entry.title || '')) return true;
  if (/Not present in MEDITECH/i.test(entry.detail || '')) return true;
  if (entry.response && /^(Y|N|Yes|No)$/i.test(entry.response.trim()) && title.length >= 3) {
    return false;
  }
  // Dated clinical rows (immunizations, mental scores, family) with short titles
  if (hasText(entry.date) && title.length >= 3) return false;
  if (hasText(entry.relationship) && title.length >= 3) return false;
  // Contact cards: phone / role / email / address / NPI live in dedicated fields now
  if (
    hasText(entry.phone) ||
    hasText(entry.email) ||
    hasText(entry.address) ||
    hasText(entry.role) ||
    hasText(entry.npi) ||
    hasText(entry.icd10) ||
    hasText(entry.code)
  ) {
    return false;
  }
  if (hasText(entry.instructions) && (entry.instructions ?? '').length >= 8) return false;
  if (title.length >= 12 && !/^(role|name|status|date|notes)\b/i.test(title)) {
    return false;
  }
  const detail = collapse(entry.detail);
  if (!detail || detail.length < 8) return true;
  if (/^none recorded\.?$/i.test(detail)) return true;
  if (/^none reported\.?$/i.test(detail)) return true;
  return false;
}

function collapse(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function scoreExtendedEntries(rows: Tab14ClinicalEntry[] | undefined): {
  status: AthenaSectionStatus;
  count: number;
  detail: string;
} {
  const list = rows ?? [];
  if (!list.length) {
    return { status: 'missing', count: 0, detail: 'No entries parsed' };
  }
  const meaningful = list.filter((e) => !isThinEntry(e));
  if (meaningful.length === 0) {
    return {
      status: 'none_recorded',
      count: list.length,
      detail: list.length === 1 ? 'Explicit none / placeholder only' : 'Only thin placeholders',
    };
  }
  if (meaningful.length < list.length && meaningful.length === 1 && list.length <= 2) {
    return {
      status: 'thin',
      count: meaningful.length,
      detail: `${meaningful.length} useful / ${list.length} total — may be incomplete`,
    };
  }
  return {
    status: 'filled',
    count: meaningful.length,
    detail: `${meaningful.length} entr${meaningful.length === 1 ? 'y' : 'ies'}`,
  };
}

/** Menu label users see (matches left sidebar / PDF section titles). */
export function athenaSidebarLabel(nav: Tab14NavSection): string {
  return tab14NavLabel(nav);
}

function scoreLegacyNavKey(
  key: string,
  input: AthenaPortabilityCompletenessInput
): { status: AthenaSectionStatus; count: number; detail: string } {
  switch (key) {
    case 'demographics': {
      const keys = [
        input.patientFields.givenName,
        input.patientFields.familyName,
        input.patientFields.dateOfBirth,
        input.patientFields.sexAtBirth,
        input.patientFields.phoneNumber || input.patientFields.email,
        input.patientFields.address,
      ];
      const hit = keys.filter((k) => hasText(k)).length;
      return {
        status: hit >= 4 ? 'filled' : hit >= 2 ? 'thin' : 'missing',
        count: hit,
        detail: `${hit}/6 identity fields`,
      };
    }
    case 'allergies':
      if (input.noKnownDrugAllergies) {
        return { status: 'none_recorded', count: 0, detail: 'NKDA / none' };
      }
      return input.allergies.some((a) => hasText(a.allergyName))
        ? {
            status: 'filled',
            count: input.allergies.length,
            detail: `${input.allergies.length} allergy row(s)`,
          }
        : { status: 'missing', count: 0, detail: 'No allergies parsed' };
    case 'medications':
      return input.medications.some((m) => hasText(m.genericName) || hasText(m.brandName))
        ? {
            status: 'filled',
            count: input.medications.length,
            detail: `${input.medications.length} medication(s)`,
          }
        : { status: 'missing', count: 0, detail: 'No medications parsed' };
    case 'problems':
      if (input.noKnownProblems) {
        return { status: 'none_recorded', count: 0, detail: 'No known problems' };
      }
      return input.chronicConditions.some((c) => hasText(c.conditionName))
        ? {
            status: 'filled',
            count: input.chronicConditions.length,
            detail: `${input.chronicConditions.length} condition(s)`,
          }
        : { status: 'missing', count: 0, detail: 'No problems parsed' };
    case 'payers':
      return input.insurances.some(
        (r) =>
          hasText(r.providerName) &&
          r.providerName.length <= 120 &&
          !/text\/html/i.test(r.providerName)
      )
        ? {
            status: 'filled',
            count: input.insurances.length,
            detail: collapse(input.insurances[0]?.providerName ?? '').slice(0, 60),
          }
        : { status: 'missing', count: 0, detail: 'No payer parsed' };
    case 'results':
      return input.labPanels.length >= 1
        ? {
            status: 'filled',
            count: input.labPanels.length,
            detail: `${input.labPanels.length} panel(s)`,
          }
        : { status: 'missing', count: 0, detail: 'No lab panels' };
    case 'vitals': {
      const vitalsN = input.vitalsHistory?.length ?? 0;
      const vitalsLive =
        hasText(input.patientFields.systolicBp) || hasText(input.patientFields.heightInches);
      if (vitalsN >= 1 || vitalsLive) {
        return {
          status: 'filled',
          count: vitalsN || 1,
          detail: vitalsN ? `${vitalsN} dated reading(s)` : 'Latest vitals on patient',
        };
      }
      return { status: 'missing', count: 0, detail: 'No vitals' };
    }
    case 'pastEncounters': {
      const visits = input.hospitalVisits ?? [];
      return visits.some(
        (v) => hasText(v.visitDate) || hasText(v.facilityName) || hasText(v.reason)
      )
        ? {
            status: 'filled',
            count: visits.length,
            detail: `${visits.length} encounter(s)`,
          }
        : { status: 'missing', count: 0, detail: 'No encounters parsed' };
    }
    default:
      return { status: 'missing', count: 0, detail: 'Unhandled legacy section' };
  }
}

function scoreExtendedNavKey(
  key: Tab14ExtendedSectionKey,
  ext: Tab14ExtendedSections | undefined
): { status: AthenaSectionStatus; count: number; detail: string } {
  const scored = scoreExtendedEntries(ext?.[key]);
  if (key === 'careTeam' && scored.status === 'filled') {
    const rich = (ext?.careTeam ?? []).filter(
      (e) => hasText(e.npi) || /\bNPI:/i.test(e.detail)
    );
    if (rich.length === 0 && (ext?.careTeam?.length ?? 0) <= 1) {
      return {
        status: 'thin',
        count: scored.count,
        detail: 'Present but missing NPI table depth',
      };
    }
  }
  return scored;
}

/**
 * Score every left-menu section in `TAB14_PORTABILITY_NAV` order.
 */
export function computeAthenaPortabilityCompleteness(
  input: AthenaPortabilityCompletenessInput
): AthenaPortabilityCompletenessResult {
  const sections: AthenaSectionScore[] = [];

  for (const nav of TAB14_PORTABILITY_NAV) {
    const label = athenaSidebarLabel(nav);
    const scored = nav.legacy
      ? scoreLegacyNavKey(nav.key, input)
      : scoreExtendedNavKey(nav.key as Tab14ExtendedSectionKey, input.extendedSections);
    sections.push({
      id: nav.key,
      label,
      status: scored.status,
      count: scored.count,
      detail: scored.detail,
    });
  }

  const completeish = sections.filter(
    (s) => s.status === 'filled' || s.status === 'none_recorded'
  ).length;
  const total = sections.length || 1;
  const scorePercent = Math.round((completeish / total) * 100);
  const gapLabels = sections
    .filter((s) => s.status === 'missing' || s.status === 'thin')
    .map((s) => s.label);

  return {
    scorePercent,
    filled: completeish,
    total,
    sections,
    gapLabels,
  };
}

export function formatAthenaPortabilityCompletenessSummary(
  result: AthenaPortabilityCompletenessResult
): string {
  if (result.gapLabels.length === 0) {
    return `Athena sections ${result.scorePercent}% (${result.filled}/${result.total} menu items) — no portability gaps detected.`;
  }
  const shown = result.gapLabels.slice(0, 8).join(', ');
  const more =
    result.gapLabels.length > 8 ? ` (+${result.gapLabels.length - 8} more)` : '';
  return `Athena sections ${result.scorePercent}% (${result.filled}/${result.total} menu items) — gaps: ${shown}${more}.`;
}

/** True when a parse result looks like Athena / rich portability (worth section scoring). */
export function shouldScoreAthenaPortability(result: Tab14IntakeParseResult): boolean {
  const ext = result.extendedSections;
  if (!ext) return false;
  let n = 0;
  for (const key of TAB14_EXTENDED_SECTION_KEYS) {
    n += ext[key]?.length ?? 0;
    if (n >= 3) return true;
  }
  return (result.labPanels?.length ?? 0) >= 1 && (result.vitalsHistory?.length ?? 0) >= 1;
}

export function athenaCompletenessFromParseResult(
  result: Tab14IntakeParseResult
): AthenaPortabilityCompletenessResult {
  return computeAthenaPortabilityCompleteness({
    patientFields: result.patientFields,
    allergies: result.allergies,
    noKnownDrugAllergies: result.noKnownDrugAllergies,
    medications: result.medications,
    chronicConditions: result.chronicConditions,
    noKnownProblems: result.noKnownProblems,
    insurances: result.insurances,
    labPanels: result.labPanels ?? [],
    vitalsHistory: result.vitalsHistory,
    hospitalVisits: result.hospitalVisits,
    extendedSections: result.extendedSections,
  });
}
