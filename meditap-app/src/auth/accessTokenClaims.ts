import { getStoredAccessToken } from './tokenStorage';

export function parseJwtPayload(accessToken: string): Record<string, unknown> | null {
  try {
    const part = accessToken.split('.')[1];
    if (!part) return null;
    const json = atob(part.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function getAccessTokenPayload(): Record<string, unknown> | null {
  const t = getStoredAccessToken();
  if (!t) return null;
  return parseJwtPayload(t);
}

export function getSessionPatientSub(): string | undefined {
  const p = getAccessTokenPayload();
  const sub = p?.sub;
  return typeof sub === 'string' ? sub : undefined;
}

export function accessTokenSecondsRemaining(accessToken: string): number | null {
  const p = parseJwtPayload(accessToken);
  if (!p) return null;
  const exp = Number(p.exp);
  if (!Number.isFinite(exp)) return null;
  return exp - Math.floor(Date.now() / 1000);
}
