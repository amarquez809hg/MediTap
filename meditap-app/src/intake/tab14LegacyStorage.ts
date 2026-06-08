import type { Tab14LoadResult, Tab14SaveInput } from '../api';

const TAB14_LEGACY_KEYS = [
  'patientInfo',
  'insurances',
  'allergies',
  'medications',
  'chronicConditions',
  'hospitalVisit',
] as const;

function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

/** True when any legacy Tab14 localStorage keys exist (pre–API-only builds). */
export function hasTab14LegacyLocalStorage(): boolean {
  if (typeof window === 'undefined') return false;
  return TAB14_LEGACY_KEYS.some((k) => localStorage.getItem(k) != null);
}

/**
 * Read Tab14 form data stored in localStorage before API-only persistence.
 * Returns null when patient name is missing (not a migratable chart).
 */
export function loadTab14LegacyFromLocalStorage(): Tab14LoadResult | null {
  const patient = readJson<Record<string, unknown>>('patientInfo');
  if (!patient) return null;

  const givenName = String(patient.givenName ?? patient.firstName ?? '').trim();
  const familyName = String(patient.familyName ?? patient.lastName ?? '').trim();
  if (!givenName || !familyName) return null;

  const insurances =
    readJson<Tab14LoadResult['insurances']>('insurances') ?? [];
  const allergies = readJson<Tab14LoadResult['allergies']>('allergies') ?? [];
  const medications =
    readJson<Tab14LoadResult['medications']>('medications') ?? [];
  const chronicConditions =
    readJson<Tab14LoadResult['chronicConditions']>('chronicConditions') ?? [];
  const hospitalVisit =
    readJson<Tab14LoadResult['hospitalVisit']>('hospitalVisit') ?? {
      facilityName: '',
      visitType: '',
      reason: '',
      visitDate: '',
      dischargeDate: '',
      attendingPhysician: '',
      reportId: '',
    };

  return {
    hasPatient: true,
    patient: {
      givenName,
      familyName,
      dateOfBirth: String(patient.dateOfBirth ?? '').trim(),
      bloodType: String(patient.bloodType ?? '').trim(),
      email: String(patient.email ?? '').trim(),
      phoneNumber: String(patient.phoneNumber ?? patient.phone ?? '').trim(),
      address: String(patient.address ?? '').trim(),
      race: String(patient.race ?? '').trim(),
      ethnicity: String(patient.ethnicity ?? '').trim(),
      preferredLanguage: String(patient.preferredLanguage ?? '').trim(),
      maritalStatus: String(patient.maritalStatus ?? '').trim(),
      sexAtBirth: String(patient.sexAtBirth ?? '').trim(),
      heightInches: String(patient.heightInches ?? '').trim(),
      weightLbs: String(patient.weightLbs ?? '').trim(),
      systolicBp: '',
      diastolicBp: '',
      heartRate: '',
    },
    insurances: Array.isArray(insurances) ? insurances : [],
    allergies: Array.isArray(allergies) ? allergies : [],
    medications: Array.isArray(medications) ? medications : [],
    chronicConditions: Array.isArray(chronicConditions) ? chronicConditions : [],
    hospitalVisit,
    noAllergies: Array.isArray(allergies) && allergies.length === 0,
  };
}

export function tab14LegacyToSaveInput(
  username: string | null,
  legacy: Tab14LoadResult
): Tab14SaveInput {
  return {
    username,
    patient: legacy.patient,
    insurances: legacy.insurances,
    allergies: legacy.allergies,
    medications: legacy.medications,
    chronicConditions: legacy.chronicConditions,
    hospitalVisit: legacy.hospitalVisit,
    noAllergies: legacy.noAllergies,
  };
}
