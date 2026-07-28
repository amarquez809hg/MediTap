/**
 * Admin selected-patient context (on-behalf chart work).
 * Persisted in sessionStorage so refresh keeps the selection.
 */

const STORAGE_KEY = 'meditap_admin_selected_patient';

export type AdminSelectedPatient = {
  patientId: string;
  displayName: string;
  email?: string | null;
};

export function readAdminSelectedPatient(): AdminSelectedPatient | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AdminSelectedPatient;
    if (!parsed?.patientId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeAdminSelectedPatient(patient: AdminSelectedPatient | null): void {
  try {
    if (!patient) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(patient));
  } catch {
    /* ignore */
  }
}

export function getAdminSelectedPatientId(): string | null {
  return readAdminSelectedPatient()?.patientId ?? null;
}

/** Sent on API calls so backend/logs know the admin chart target. */
export function getAdminPatientRequestHeaders(): Record<string, string> {
  const id = getAdminSelectedPatientId();
  if (!id) return {};
  return { 'X-Meditap-Patient-Id': id };
}

export function formatPatientDisplayName(p: {
  given_name?: string | null;
  family_name?: string | null;
  email?: string | null;
}): string {
  const family = (p.family_name || '').trim();
  const given = (p.given_name || '').trim();
  if (family || given) return `${family}${family && given ? ', ' : ''}${given}`.trim();
  return (p.email || '').trim() || 'Patient';
}
