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
  imagingResultsNeedRebuild,
  mergeExtendedSections,
  sanitizeImagingResultsEntries,
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

export function snapshotNeedsExtendedRestore(
  snap: StoredParseSnapshot | null | undefined
): boolean {
  return countExtendedEntries(snap?.extendedSections) === 0;
}

/** True when clinical repeaters look sparse vs a typical Athena/Epic export. */
export function snapshotNeedsClinicalRestore(
  snap: StoredParseSnapshot | null | undefined
): boolean {
  if (!snap) return true;
  const meds = snap.medications?.length ?? 0;
  const allergies = snap.allergies?.length ?? 0;
  const problems = snap.chronicConditions?.length ?? 0;
  const labs = snap.labPanels?.length ?? 0;
  const visits = snapshotHospitalVisits(snap).length;
  // One medication with empty sibling sections is a classic partial Save/API overwrite.
  if (meds <= 1 && allergies <= 1 && problems <= 1 && labs === 0 && visits === 0) {
    return true;
  }
  return snapshotNeedsExtendedRestore(snap) && meds + allergies + problems + labs < 4;
}

/**
 * True when Imaging Results still holds table-header junk (e.g. "Status Detail")
 * from an older parse — force vault PDF reparse even if other sections look rich.
 */
export function snapshotNeedsImagingRestore(
  snap: StoredParseSnapshot | null | undefined
): boolean {
  return imagingResultsNeedRebuild(snap?.extendedSections?.imagingResults);
}

/**
 * True when a rich Athena chart is missing Past Encounters — often the
 * Date/Type/Performer table was never parsed (Harold-style) while meds/PoT filled.
 */
export function snapshotNeedsEncountersRestore(
  snap: StoredParseSnapshot | null | undefined
): boolean {
  const visits = snapshotHospitalVisits(snap).filter(
    (v) =>
      Boolean(String(v.visitDate ?? '').trim()) ||
      Boolean(String(v.encounterId ?? '').trim()) ||
      Boolean(String(v.diagnosisNote ?? '').trim()) ||
      Boolean(String(v.facilityName ?? '').trim())
  );
  if (visits.length > 0) return false;
  const meds = snap?.medications?.length ?? 0;
  const pot = snap?.extendedSections?.planOfTreatment?.length ?? 0;
  return meds >= 4 || pot >= 5;
}

export function buildStoredParseSnapshot(input: {
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
}): StoredParseSnapshot {
  return {
    patientFields: input.patientFields,
    allergies: input.allergies,
    medications: input.medications,
    chronicConditions: input.chronicConditions,
    insurances: input.insurances,
    hospitalVisit: input.hospitalVisit,
    hospitalVisits: input.hospitalVisits,
    labPanels: input.labPanels,
    extendedSections: input.extendedSections,
    vitalsHistory: input.vitalsHistory,
    noKnownDrugAllergies: input.noKnownDrugAllergies,
    noKnownProblems: input.noKnownProblems,
    source: input.source,
  };
}

export function extendedSectionsFromSnapshot(
  snap: StoredParseSnapshot | null | undefined
): Tab14ExtendedSections | null {
  if (!snap?.extendedSections) return null;
  const merged = mergeExtendedSections(
    emptyExtendedSections(),
    snap.extendedSections
  );
  // Never hydrate header junk into the Imaging Results form.
  merged.imagingResults = sanitizeImagingResultsEntries(merged.imagingResults);
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

function namedRowCount(
  rows: Array<Record<string, unknown>> | null | undefined,
  keys: string[]
): number {
  if (!rows?.length) return 0;
  return rows.filter((row) =>
    keys.some((k) => {
      const v = String(row[k] ?? '').trim();
      return Boolean(v) && v !== '—' && v !== 'N/A';
    })
  ).length;
}

/**
 * Prefer the longer named-row list. A single persisted API medication must not
 * hide a full PDF intake list (and vice versa when staff edited more on the API).
 */
export function preferRicherNamedRows<T extends Record<string, unknown>>(
  apiRows: T[] | null | undefined,
  snapRows: T[] | null | undefined,
  nameKeys: string[]
): T[] {
  const api = (apiRows ?? []) as T[];
  const snap = (snapRows ?? []) as T[];
  const apiN = namedRowCount(api, nameKeys);
  const snapN = namedRowCount(snap, nameKeys);
  if (snapN > apiN) return snap;
  if (apiN > 0) return api;
  return snap;
}

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
  const snapVisits = snapshotHospitalVisits(snap);
  const hospitalVisits = preferRicherNamedRows(
    api.hospitalVisits as Tab14HospitalFields[],
    snapVisits,
    ['facilityName', 'visitDate', 'reason', 'visitType']
  );

  const allergies = preferRicherNamedRows(
    api.allergies as Tab14AllergyRow[],
    snap.allergies ?? [],
    ['allergyName']
  );
  const medications = preferRicherNamedRows(
    api.medications as Tab14MedicationRow[],
    snap.medications ?? [],
    ['genericName', 'brandName']
  );
  const chronicConditions = preferRicherNamedRows(
    api.chronicConditions as Tab14ChronicRow[],
    snap.chronicConditions ?? [],
    ['conditionName', 'icdCode']
  );
  const insurances = preferRicherNamedRows(
    api.insurances as Tab14InsuranceRow[],
    snap.insurances ?? [],
    ['providerName', 'policyNumber', 'memberID']
  );
  const labPanels = preferRicherNamedRows(
    api.labPanels,
    snap.labPanels ?? [],
    ['testName', 'displayCode']
  );

  return {
    allergies,
    noAllergies:
      allergies.length > 0
        ? false
        : api.allergies.length
          ? api.noAllergies
          : Boolean(snap.noKnownDrugAllergies),
    medications,
    noMedications: medications.length === 0,
    chronicConditions,
    noChronicConditions:
      chronicConditions.length > 0 &&
      !chronicConditions.every((c) =>
        /no\s+known\s+problems/i.test(c.conditionName || '')
      )
        ? false
        : api.chronicConditions.length
          ? api.noChronicConditions
          : Boolean(snap.noKnownProblems),
    insurances,
    hospitalVisits,
    labPanels,
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

