import { readMediTapDarkMode } from '../theme/darkModeSync';
import { readMediTapLocale } from '../i18n/localeSync';
import {
  DEFAULT_USER_PREFERENCES,
  normalizeUserPreferences,
  type UserPreferences,
} from './userPreferencesTypes';

const CACHE_PREFIX = 'meditap_user_prefs_v1:';

/** Legacy global keys (pre-profile storage). Used once to migrate into the server profile. */
const LEGACY_PUSH = 'meditap_settings_push_notifications';
const LEGACY_CARD_STATUS = 'meditap_demo_card_status';
const LEGACY_CARD_REPORTED_AT = 'meditap_demo_card_reported_at';

function cacheKey(username: string): string {
  return `${CACHE_PREFIX}${username.trim().toLowerCase()}`;
}

export function readUserPreferencesCache(username: string | null): UserPreferences | null {
  if (!username?.trim()) return null;
  try {
    const raw = localStorage.getItem(cacheKey(username));
    if (!raw) return null;
    return normalizeUserPreferences(JSON.parse(raw) as Partial<UserPreferences>);
  } catch {
    return null;
  }
}

export function writeUserPreferencesCache(
  username: string | null,
  prefs: UserPreferences
): void {
  if (!username?.trim()) return;
  try {
    localStorage.setItem(cacheKey(username), JSON.stringify(prefs));
  } catch {
    /* ignore */
  }
}

/** Read browser-global settings from before profile-backed storage existed. */
export function readLegacyBrowserPreferences(): UserPreferences {
  let card_status = DEFAULT_USER_PREFERENCES.card_status;
  let card_reported_at: string | null = null;
  try {
    const stored = localStorage.getItem(LEGACY_CARD_STATUS);
    if (stored === 'reported_lost' || stored === 'inactive') {
      card_status = stored;
    }
    card_reported_at = localStorage.getItem(LEGACY_CARD_REPORTED_AT);
  } catch {
    /* ignore */
  }

  let push_notifications = true;
  try {
    push_notifications = localStorage.getItem(LEGACY_PUSH) !== '0';
  } catch {
    /* ignore */
  }

  return normalizeUserPreferences({
    locale: readMediTapLocale(),
    dark_mode: readMediTapDarkMode(),
    push_notifications,
    card_status,
    card_reported_at,
  });
}

/** Keep legacy keys in sync so pre-login bootstrap matches the signed-in profile. */
export function mirrorPreferencesToLegacyBrowserKeys(prefs: UserPreferences): void {
  try {
    localStorage.setItem('meditap_settings_locale', prefs.locale);
    localStorage.setItem('meditap_settings_dark_mode', prefs.dark_mode ? '1' : '0');
    localStorage.setItem(LEGACY_PUSH, prefs.push_notifications ? '1' : '0');
    localStorage.setItem(LEGACY_CARD_STATUS, prefs.card_status);
    if (prefs.card_reported_at) {
      localStorage.setItem(LEGACY_CARD_REPORTED_AT, prefs.card_reported_at);
    } else {
      localStorage.removeItem(LEGACY_CARD_REPORTED_AT);
    }
  } catch {
    /* ignore */
  }
}
