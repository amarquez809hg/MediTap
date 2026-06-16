import type {
  Tab14AllergyRow,
  Tab14ChronicRow,
  Tab14HospitalFields,
  Tab14InsuranceRow,
  Tab14IntakeParseResult,
  Tab14MedicationRow,
} from "./tab14IntakeTypes";
import { mergeAllergiesFromPdf } from "./mergeTab14Allergies";
import {
  hasHospitalVisitData,
  mergeChronicConditionsFromPdf,
  mergeHospitalVisitFromPdf,
  mergeInsurancesFromPdf,
  mergeMedicationsFromPdf,
} from "./mergeTab14IntakeUpload";

export type Tab14MergeSnapshot = {
  allergies: Tab14AllergyRow[];
  noAllergies: boolean;
  insurances: Tab14InsuranceRow[];
  medications: Tab14MedicationRow[];
  noMedications: boolean;
  chronicConditions: Tab14ChronicRow[];
  noChronicConditions: boolean;
  hospitalVisit: Tab14HospitalFields;
};

export type Tab14MergeStats = {
  allergyMergeAdded: number;
  insuranceMergeAdded: number;
  insuranceFieldsFilled: number;
  medicationMergeAdded: number;
  chronicMergeAdded: number;
  hospitalFieldsAdded: number;
};

const emptyStats = (): Tab14MergeStats => ({
  allergyMergeAdded: 0,
  insuranceMergeAdded: 0,
  insuranceFieldsFilled: 0,
  medicationMergeAdded: 0,
  chronicMergeAdded: 0,
  hospitalFieldsAdded: 0,
});

/** Human-readable merge counts for upload status messages. */
export function formatTab14MergeStatsNotes(stats: Tab14MergeStats): string[] {
  const notes: string[] = [];
  if (stats.allergyMergeAdded > 0) {
    notes.push(
      `${stats.allergyMergeAdded} new allergy/allergies added (existing kept)`
    );
  }
  if (stats.insuranceMergeAdded > 0) {
    notes.push(
      `${stats.insuranceMergeAdded} new insurance policy/policies added (existing kept)`
    );
  }
  if (stats.insuranceFieldsFilled > 0) {
    notes.push(
      `${stats.insuranceFieldsFilled} insurance field(s) filled in (existing values kept)`
    );
  }
  if (stats.medicationMergeAdded > 0) {
    notes.push(
      `${stats.medicationMergeAdded} new medication(s) added (existing kept)`
    );
  }
  if (stats.chronicMergeAdded > 0) {
    notes.push(
      `${stats.chronicMergeAdded} new chronic condition(s) added (existing kept)`
    );
  }
  if (stats.hospitalFieldsAdded > 0) {
    notes.push(
      `${stats.hospitalFieldsAdded} hospital visit field(s) filled in (existing values kept)`
    );
  }
  return notes;
}

/** Merge one parsed PDF/image bundle into the current Tab14 form snapshot. */
export function applyTab14ParseBundle(
  snapshot: Tab14MergeSnapshot,
  bundle: Tab14IntakeParseResult
): { snapshot: Tab14MergeSnapshot; stats: Tab14MergeStats } {
  const stats = emptyStats();
  let next: Tab14MergeSnapshot = { ...snapshot };

  if (bundle.allergies.length > 0 || bundle.noKnownDrugAllergies) {
    const mergedAllergies = mergeAllergiesFromPdf(
      next.allergies.map((row) => ({
        ...row,
        allergyTypeOther: row.allergyTypeOther ?? "",
      })),
      bundle.allergies,
      bundle.noKnownDrugAllergies
    );
    stats.allergyMergeAdded = mergedAllergies.addedCount;
    next = {
      ...next,
      noAllergies: mergedAllergies.noAllergies,
      allergies: mergedAllergies.allergies.map((row) => ({
        ...row,
        allergyTypeOther: row.allergyTypeOther ?? "",
      })),
    };
  }

  if (bundle.insurances.length > 0) {
    const mergedInsurances = mergeInsurancesFromPdf(
      next.insurances,
      bundle.insurances
    );
    stats.insuranceMergeAdded = mergedInsurances.addedCount;
    stats.insuranceFieldsFilled = mergedInsurances.filledFieldCount;
    next = { ...next, insurances: mergedInsurances.rows };
  }

  if (bundle.medications.length > 0) {
    const mergedMedications = mergeMedicationsFromPdf(
      next.medications,
      bundle.medications
    );
    stats.medicationMergeAdded = mergedMedications.addedCount;
    next = {
      ...next,
      noMedications: false,
      medications: mergedMedications.rows,
    };
  }

  if (bundle.chronicConditions.length > 0) {
    const mergedChronic = mergeChronicConditionsFromPdf(
      next.chronicConditions,
      bundle.chronicConditions
    );
    stats.chronicMergeAdded = mergedChronic.addedCount;
    next = {
      ...next,
      noChronicConditions: false,
      chronicConditions: mergedChronic.rows,
    };
  }

  if (hasHospitalVisitData(bundle.hospitalVisit)) {
    const mergedHospital = mergeHospitalVisitFromPdf(
      next.hospitalVisit,
      bundle.hospitalVisit
    );
    stats.hospitalFieldsAdded = mergedHospital.addedFieldCount;
    next = { ...next, hospitalVisit: mergedHospital.visit };
  }

  return { snapshot: next, stats };
}
