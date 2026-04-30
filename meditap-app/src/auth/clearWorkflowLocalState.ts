import { APPOINTMENTS_STORAGE_PREFIX } from '../appointments/appointmentStorage';
import { clearMeditapIntakeElevation } from './staffElevationStorage';

/** Keys used by Tab14 intake draft persistence (not namespaced per user). */
const TAB14_WORKFLOW_KEYS = [
  'patientInfo',
  'insurances',
  'allergies',
  'medications',
  'chronicConditions',
  'hospitalVisit',
] as const;

const APPOINTMENTS_KEY_PREFIX = `${APPOINTMENTS_STORAGE_PREFIX}:`;

/**
 * Removes Tab14 draft data, per-user appointment caches (Tab4), and staff elevation.
 * Preserves JWT and global settings (dark mode, push toggle).
 * Call after a successful sign-in (new account or account switch) and on logout / session end.
 */
export function clearMediTapWorkflowLocalState(): void {
  if (typeof window === 'undefined') return;

  clearMeditapIntakeElevation();

  try {
    for (const k of TAB14_WORKFLOW_KEYS) {
      localStorage.removeItem(k);
    }
    const toRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith(APPOINTMENTS_KEY_PREFIX)) {
        toRemove.push(key);
      }
    }
    for (const key of toRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    /* quota / private mode */
  }
}

/**
 * Tab14 “Clear form” must not wipe JWT or global settings (avoid `localStorage.clear()`).
 */
export function clearTab14DraftKeysOnly(): void {
  if (typeof window === 'undefined') return;
  try {
    for (const k of TAB14_WORKFLOW_KEYS) {
      localStorage.removeItem(k);
    }
  } catch {
    /* ignore */
  }
}
