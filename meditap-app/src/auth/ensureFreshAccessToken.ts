import { getApiBase } from '../config/api';
import { accessTokenSecondsRemaining } from './accessTokenClaims';
import {
  clearStoredTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  setStoredTokens,
} from './tokenStorage';
import { emitSessionExpired } from './sessionEvents';

/**
 * Refreshes the access token when it is missing or expires within minValiditySeconds.
 * Clears storage and emits session-expired when refresh fails but a refresh token existed.
 */
export async function ensureFreshAccessToken(minValiditySeconds = 30): Promise<void> {
  const access = getStoredAccessToken();
  const refresh = getStoredRefreshToken();
  if (!refresh) return;
  const remain = access ? accessTokenSecondsRemaining(access) : 0;
  if (access && remain !== null && remain > minValiditySeconds) return;

  const base = getApiBase();
  if (!base) return;

  const r = await fetch(`${base}/api/auth/token/refresh/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh }),
  });
  if (!r.ok) {
    clearStoredTokens();
    emitSessionExpired();
    return;
  }
  const data = (await r.json()) as { access: string; refresh?: string };
  setStoredTokens(data.access, data.refresh ?? refresh);
}
