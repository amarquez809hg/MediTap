import { emitSessionExpired } from './sessionEvents';
import { getStoredAccessToken, getStoredRefreshToken } from './tokenStorage';
import { ensureFreshAccessToken } from './ensureFreshAccessToken';

/** Headers for Django API calls; refreshes access token when close to expiry. */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const hadSession = !!(getStoredAccessToken() || getStoredRefreshToken());
  await ensureFreshAccessToken(30);
  const token = getStoredAccessToken();
  if (hadSession && !token) {
    emitSessionExpired();
  }
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
