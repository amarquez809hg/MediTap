/**
 * Patient chart pages embedded inside the admin portal content zone.
 * Keeps admin sidebar/top bar; avoids leaving for /app/* user shell.
 */

export const ADMIN_PATIENT_VIEW_BASE = '/admin-portal/patient-view';

export const ADMIN_PATIENT_VIEW_PATHS = {
  dashboard: ADMIN_PATIENT_VIEW_BASE,
  status: `${ADMIN_PATIENT_VIEW_BASE}/status`,
  appointments: `${ADMIN_PATIENT_VIEW_BASE}/appointments`,
  conditions: `${ADMIN_PATIENT_VIEW_BASE}/conditions`,
  incidents: `${ADMIN_PATIENT_VIEW_BASE}/incidents`,
  labs: `${ADMIN_PATIENT_VIEW_BASE}/labs`,
  insurance: `${ADMIN_PATIENT_VIEW_BASE}/insurance`,
  intake: `${ADMIN_PATIENT_VIEW_BASE}/intake`,
  settings: `${ADMIN_PATIENT_VIEW_BASE}/settings`,
} as const;

export type AdminPatientViewKey = keyof typeof ADMIN_PATIENT_VIEW_PATHS;
