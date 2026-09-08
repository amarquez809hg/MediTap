/**
 * Lightweight intake completeness score after PDF import / before Save.
 */

import type {
  Tab14AllergyRow,
  Tab14ChronicRow,
  Tab14HospitalFields,
  Tab14InsuranceRow,
  Tab14MedicationRow,
  Tab14PatientFields,
} from './tab14IntakeTypes';

export type IntakeCompletenessInput = {
  patient: Tab14PatientFields;
  insurances: Tab14InsuranceRow[];
  allergies: Tab14AllergyRow[];
  noAllergies: boolean;
  medications: Tab14MedicationRow[];
  noMedications: boolean;
  chronicConditions: Tab14ChronicRow[];
  noChronicConditions: boolean;
  hospitalVisits: Tab14HospitalFields[];
};

export type IntakeCompletenessSection = {
  id: string;
  label: string;
  weight: number;
  complete: boolean;
  detail: string;
};

export type IntakeCompletenessResult = {
  scorePercent: number;
  sections: IntakeCompletenessSection[];
  missingLabels: string[];
};

function hasText(v: string | undefined | null): boolean {
  return Boolean(v && String(v).trim());
}

function scoreInsurance(rows: Tab14InsuranceRow[]): boolean {
  return rows.some(
    (r) =>
      hasText(r.providerName) ||
      hasText(r.policyNumber) ||
      hasText(r.memberID) ||
      hasText(r.groupNumber)
  );
}

function scoreAllergies(rows: Tab14AllergyRow[], none: boolean): boolean {
  if (none) return true;
  return rows.some((r) => hasText(r.allergyName));
}

function scoreMeds(rows: Tab14MedicationRow[], none: boolean): boolean {
  if (none) return true;
  return rows.some((r) => hasText(r.genericName) || hasText(r.brandName));
}

function scoreChronic(rows: Tab14ChronicRow[], none: boolean): boolean {
  if (none) return true;
  return rows.some((r) => hasText(r.conditionName));
}

function scoreHospital(rows: Tab14HospitalFields[]): boolean {
  return rows.some(
    (r) =>
      hasText(r.facilityName) ||
      hasText(r.visitDate) ||
      hasText(r.reason)
  );
}

/** Weighted completeness for professional intake checklist (0–100). */
export function computeIntakeCompleteness(
  input: IntakeCompletenessInput
): IntakeCompletenessResult {
  const sections: IntakeCompletenessSection[] = [
    {
      id: 'identity',
      label: 'Legal name',
      weight: 20,
      complete:
        hasText(input.patient.givenName) && hasText(input.patient.familyName),
      detail: 'Given + family name',
    },
    {
      id: 'dob',
      label: 'Date of birth',
      weight: 15,
      complete: hasText(input.patient.dateOfBirth),
      detail: 'DOB required for chart identity',
    },
    {
      id: 'contact',
      label: 'Contact',
      weight: 15,
      complete:
        hasText(input.patient.email) ||
        hasText(input.patient.phoneNumber) ||
        hasText(input.patient.address),
      detail: 'Email, phone, or address',
    },
    {
      id: 'clinical-basics',
      label: 'Clinical basics',
      weight: 10,
      complete:
        hasText(input.patient.bloodType) ||
        hasText(input.patient.sexAtBirth) ||
        hasText(input.patient.preferredLanguage),
      detail: 'Blood type, sex, or language',
    },
    {
      id: 'insurance',
      label: 'Insurance',
      weight: 15,
      complete: scoreInsurance(input.insurances),
      detail: 'At least one coverage row',
    },
    {
      id: 'allergies',
      label: 'Allergies',
      weight: 10,
      complete: scoreAllergies(input.allergies, input.noAllergies),
      detail: 'List or explicit none',
    },
    {
      id: 'medications',
      label: 'Medications',
      weight: 10,
      complete: scoreMeds(input.medications, input.noMedications),
      detail: 'List or explicit none',
    },
    {
      id: 'conditions',
      label: 'Chronic conditions',
      weight: 5,
      complete: scoreChronic(
        input.chronicConditions,
        input.noChronicConditions
      ),
      detail: 'List or explicit none',
    },
  ];

  // Hospital visits are optional bonus — tracked but not required for score floor
  const hospitalComplete = scoreHospital(input.hospitalVisits);
  if (hospitalComplete) {
    sections.push({
      id: 'hospital',
      label: 'Hospital / visits',
      weight: 0,
      complete: true,
      detail: 'Visit data present (optional)',
    });
  }

  const totalWeight = sections.reduce((s, x) => s + x.weight, 0) || 1;
  const earned = sections.reduce(
    (s, x) => s + (x.complete ? x.weight : 0),
    0
  );
  const scorePercent = Math.round((earned / totalWeight) * 100);
  const missingLabels = sections
    .filter((x) => x.weight > 0 && !x.complete)
    .map((x) => x.label);

  return { scorePercent, sections, missingLabels };
}

export function formatIntakeCompletenessSummary(
  result: IntakeCompletenessResult
): string {
  if (result.missingLabels.length === 0) {
    return `Intake completeness ${result.scorePercent}% — all core sections filled.`;
  }
  return `Intake completeness ${result.scorePercent}% — still need: ${result.missingLabels.join(', ')}.`;
}
