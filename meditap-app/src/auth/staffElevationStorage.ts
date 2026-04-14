import { getKeycloak } from '../config/keycloak';

const STORAGE_KEY = 'meditap_intake_elevation_jwt';

const ELEVATION_TYP = 'meditap-patient-intake-elevation';

export function setMeditapIntakeElevationToken(token: string | null): void {
  if (!token) sessionStorage.removeItem(STORAGE_KEY);
  else sessionStorage.setItem(STORAGE_KEY, token);
}

export function getMeditapIntakeElevationToken(): string | null {
  return sessionStorage.getItem(STORAGE_KEY);
}

export function clearMeditapIntakeElevation(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const part = token.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function isMeditapIntakeElevationValidForPatient(
  patientSub: string | undefined
): boolean {
  if (!patientSub) return false;
  const t = getMeditapIntakeElevationToken();
  if (!t) return false;
  const p = parseJwtPayload(t);
  if (!p || p.typ !== ELEVATION_TYP) return false;
  if (String(p.patient_sub) !== patientSub) return false;
  const exp = Number(p.exp);
  if (!Number.isFinite(exp)) return false;
  return exp > Date.now() / 1000 + 15;
}

/** Attach to API calls when a valid elevation exists for the current Keycloak user. */
export function getMeditapElevationRequestHeaders(): Record<string, string> {
  const t = getMeditapIntakeElevationToken();
  if (!t) return {};
  const kc = getKeycloak();
  const sub = (kc.tokenParsed as Record<string, unknown> | undefined)?.sub;
  const patientSub = typeof sub === 'string' ? sub : undefined;
  if (!isMeditapIntakeElevationValidForPatient(patientSub)) {
    clearMeditapIntakeElevation();
    return {};
  }
  return { 'X-Meditap-Elevation': `Bearer ${t}` };
}
