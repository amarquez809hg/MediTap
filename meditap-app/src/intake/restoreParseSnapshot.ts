/**
 * Rehydrate Tab14 section state from a patient-document parse_snapshot.
 * Extended sections (Related Person, PoT, Care Team, …) are not stored on
 * Patient API rows — only in the document vault snapshot — so page load must
 * restore them or the UI shows "No entries yet" after refresh.
 */

import type {
  Tab14AllergyRow,
  Tab14ChronicRow,
  Tab14HospitalFields,
  Tab14InsuranceRow,
  Tab14LabPanel,
  Tab14MedicationRow,
  Tab14PatientFields,
} from './tab14IntakeTypes';
import type { Tab14ExtendedSections } from './tab14PortabilitySections';
import {
  emptyExtendedSections,
  mergeExtendedSections,
} from './tab14PortabilitySections';
import type { Tab14MergeSnapshot } from './applyTab14ParseBundle';

export type StoredParseSnapshot = {
  patientFields?: Tab14PatientFields;
  allergies?: Tab14AllergyRow[];
  medications?: Tab14MedicationRow[];
  chronicConditions?: Tab14ChronicRow[];
  insurances?: Tab14InsuranceRow[];
  hospitalVisit?: Tab14HospitalFields;
  hospitalVisits?: Tab14HospitalFields[];
  labPanels?: Tab14LabPanel[];
  extendedSections?: Tab14ExtendedSections;
  vitalsHistory?: unknown[];
  noKnownDrugAllergies?: boolean;
  noKnownProblems?: boolean;
  source?: string;
};

function asObject(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

export function coerceParseSnapshot(raw: unknown): StoredParseSnapshot | null {
  const obj = asObject(raw);
  if (!obj) return null;
  return obj as StoredParseSnapshot;
}

export function countExtendedEntries(
  sections: Tab14ExtendedSections | null | undefined
): number {
  if (!sections) return 0;
  return Object.values(sections).reduce((n, rows) => n + (rows?.length ?? 0), 0);
}

/** Latest document snapshot that carries extended section entries. */
export function pickRichestParseSnapshot(
  docs: Array<{ created_at?: string; parse_snapshot?: unknown }>
): StoredParseSnapshot | null {
  const ranked = [...docs]
    .map((d) => ({
      at: Date.parse(d.created_at || '') || 0,
      snap: coerceParseSnapshot(d.parse_snapshot),
    }))
    .filter((d) => d.snap)
    .sort((a, b) => b.at - a.at);

  let best: StoredParseSnapshot | null = null;
  let bestScore = -1;
  for (const row of ranked) {
    const snap = row.snap!;
    const score =
      countExtendedEntries(snap.extendedSections) * 10 +
      (snap.allergies?.length ?? 0) +
      (snap.medications?.length ?? 0) +
      (snap.insurances?.length ?? 0) +
      (snap.hospitalVisits?.length ?? 0) +
      (snap.chronicConditions?.length ?? 0) +
      (snap.labPanels?.length ?? 0) * 3;
    if (score > bestScore) {
      bestScore = score;
      best = snap;
    }
  }
  return bestScore > 0 ? best : ranked[0]?.snap ?? null;
}

export function extendedSectionsFromSnapshot(
  snap: StoredParseSnapshot | null | undefined
): Tab14ExtendedSections | null {
  if (!snap?.extendedSections) return null;
  const merged = mergeExtendedSections(
    emptyExtendedSections(),
    snap.extendedSections
  );
  return countExtendedEntries(merged) > 0 ? merged : null;
}

type ClinicalMergeInput = {
  allergies: Tab14AllergyRow[] | Array<Partial<Tab14AllergyRow> & { allergyName?: string }>;
  noAllergies: boolean;
  medications: Tab14MedicationRow[] | Array<Partial<Tab14MedicationRow> & { genericName?: string }>;
  noMedications: boolean;
  chronicConditions: Tab14ChronicRow[] | Array<Partial<Tab14ChronicRow> & { conditionName?: string }>;
  noChronicConditions: boolean;
  insurances: Tab14InsuranceRow[] | Array<Partial<Tab14InsuranceRow>>;
  hospitalVisits: Tab14HospitalFields[] | Array<Partial<Tab14HospitalFields>>;
  labPanels: Tab14LabPanel[];
};

/** Clinical repeater rows from snapshot (for filling gaps when API rows are empty). */
export function mergeSnapshotIntoClinicalSnapshot(
  api: ClinicalMergeInput,
  snap: StoredParseSnapshot | null | undefined
): Tab14MergeSnapshot {
  if (!snap) {
    return {
      allergies: (api.allergies as Tab14AllergyRow[]) ?? [],
      noAllergies: api.noAllergies,
      medications: (api.medications as Tab14MedicationRow[]) ?? [],
      noMedications: api.noMedications,
      chronicConditions: (api.chronicConditions as Tab14ChronicRow[]) ?? [],
      noChronicConditions: api.noChronicConditions,
      insurances: (api.insurances as Tab14InsuranceRow[]) ?? [],
      hospitalVisits: (api.hospitalVisits as Tab14HospitalFields[]) ?? [],
      labPanels: api.labPanels ?? [],
    };
  }
  const hospitalVisits =
    api.hospitalVisits.length > 0
      ? (api.hospitalVisits as Tab14HospitalFields[])
      : snap.hospitalVisits?.length
        ? snap.hospitalVisits
        : snap.hospitalVisit &&
            Object.values(snap.hospitalVisit).some((v) => String(v || '').trim())
          ? [snap.hospitalVisit]
          : (api.hospitalVisits as Tab14HospitalFields[]);

  return {
    allergies: api.allergies.length
      ? (api.allergies as Tab14AllergyRow[])
      : snap.allergies ?? [],
    noAllergies: api.allergies.length
      ? api.noAllergies
      : Boolean(snap.noKnownDrugAllergies),
    medications: api.medications.length
      ? (api.medications as Tab14MedicationRow[])
      : snap.medications ?? [],
    noMedications: api.medications.length
      ? api.noMedications
      : (snap.medications?.length ?? 0) === 0,
    chronicConditions: api.chronicConditions.length
      ? (api.chronicConditions as Tab14ChronicRow[])
      : snap.chronicConditions ?? [],
    noChronicConditions: api.chronicConditions.length
      ? api.noChronicConditions
      : Boolean(snap.noKnownProblems),
    insurances: api.insurances.length
      ? (api.insurances as Tab14InsuranceRow[])
      : snap.insurances ?? [],
    hospitalVisits,
    labPanels: api.labPanels.length ? api.labPanels : snap.labPanels ?? [],
  };
}

export function snapshotHospitalVisits(
  snap: StoredParseSnapshot | null | undefined
): Tab14HospitalFields[] {
  if (!snap) return [];
  if (snap.hospitalVisits?.length) return snap.hospitalVisits;
  if (
    snap.hospitalVisit &&
    Object.values(snap.hospitalVisit).some((v) => String(v || '').trim())
  ) {
    return [snap.hospitalVisit];
  }
  return [];
}

export function snapshotLastVisitLabel(
  snap: StoredParseSnapshot | null | undefined
): string | null {
  const visit = snapshotHospitalVisits(snap)[0];
  const raw = visit?.visitDate?.trim();
  return raw || null;
}

