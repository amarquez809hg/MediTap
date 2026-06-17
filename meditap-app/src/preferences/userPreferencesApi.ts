import { getAuthHeaders } from '../auth/getAuthHeaders';
import { emitSessionExpired } from '../auth/sessionEvents';
import API_BASE from '../config/api';
import {
  normalizeUserPreferences,
  type UserPreferences,
} from './userPreferencesTypes';

function normalizeApiPath(path: string): string {
  if (!path.startsWith('/')) return `/${path}`;
  return path;
}

async function preferencesRequest(
  init?: RequestInit
): Promise<UserPreferences> {
  if (!API_BASE) {
    throw new Error('API base URL is not configured.');
  }
  const headers = await getAuthHeaders();
  const response = await fetch(`${API_BASE}${normalizeApiPath('/api/auth/preferences/')}`, {
    ...init,
    headers: {
      ...headers,
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) {
    if (response.status === 401) {
      emitSessionExpired();
    }
    const errorText = await response.text().catch(() => '');
    throw new Error(`Preferences API ${response.status}: ${errorText || response.statusText}`);
  }
  const data = (await response.json()) as Partial<UserPreferences>;
  return normalizeUserPreferences(data);
}

export async function fetchUserPreferences(): Promise<UserPreferences> {
  return preferencesRequest({ method: 'GET' });
}

export async function patchUserPreferences(
  patch: Partial<UserPreferences>
): Promise<UserPreferences> {
  return preferencesRequest({
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
}
