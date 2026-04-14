import { getKeycloak } from '../config/keycloak';
import { emitSessionExpired } from './sessionEvents';

/** Headers for Django API calls; refreshes access token when close to expiry. */
export async function getAuthHeaders(): Promise<Record<string, string>> {
  const kc = getKeycloak();
  if (kc.authenticated) {
    try {
      await kc.updateToken(30);
    } catch {
      // Transient refresh failures should not always wipe the session; if there is no
      // token left, the user must sign in again.
      if (!kc.token) {
        emitSessionExpired();
      }
    }
  }
  const token = kc.token;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}
