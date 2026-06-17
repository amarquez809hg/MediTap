import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import i18n from '../i18n';
import { applyMediTapLocale, type MediTapLocale } from '../i18n/localeSync';
import { applyMediTapDarkMode } from '../theme/darkModeSync';
import { useAuth } from './AuthContext';
import { fetchUserPreferences, patchUserPreferences } from '../preferences/userPreferencesApi';
import {
  mirrorPreferencesToLegacyBrowserKeys,
  readLegacyBrowserPreferences,
  readUserPreferencesCache,
  writeUserPreferencesCache,
} from '../preferences/userPreferencesStorage';
import {
  DEFAULT_USER_PREFERENCES,
  mergeUserPreferences,
  type UserPreferences,
} from '../preferences/userPreferencesTypes';

type UserPreferencesContextValue = {
  loaded: boolean;
  preferences: UserPreferences;
  updatePreferences: (patch: Partial<UserPreferences>) => Promise<void>;
};

const UserPreferencesContext = createContext<UserPreferencesContextValue | null>(null);

function applyPreferenceSideEffects(prefs: UserPreferences): void {
  applyMediTapLocale(prefs.locale);
  void i18n.changeLanguage(prefs.locale);
  applyMediTapDarkMode(prefs.dark_mode);
  mirrorPreferencesToLegacyBrowserKeys(prefs);
}

function preferencesDiffer(a: UserPreferences, b: UserPreferences): boolean {
  return (
    a.locale !== b.locale ||
    a.dark_mode !== b.dark_mode ||
    a.push_notifications !== b.push_notifications ||
    a.card_status !== b.card_status ||
    a.card_reported_at !== b.card_reported_at
  );
}

export const UserPreferencesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { authReady, isAuthenticated, username } = useAuth();
  const [loaded, setLoaded] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    readLegacyBrowserPreferences()
  );
  const migratedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authReady) return;

    if (!isAuthenticated || !username) {
      const guest = readLegacyBrowserPreferences();
      setPreferences(guest);
      applyPreferenceSideEffects(guest);
      setLoaded(true);
      return;
    }

    let cancelled = false;
    setLoaded(false);

    (async () => {
      const legacy = readLegacyBrowserPreferences();
      const cached = readUserPreferencesCache(username);
      try {
        let server = await fetchUserPreferences();
        const migrationKey = username.trim().toLowerCase();
        if (
          migratedRef.current !== migrationKey &&
          cached == null &&
          preferencesDiffer(server, legacy)
        ) {
          server = await patchUserPreferences(legacy);
          migratedRef.current = migrationKey;
        }
        if (!cancelled) {
          setPreferences(server);
          writeUserPreferencesCache(username, server);
          applyPreferenceSideEffects(server);
          setLoaded(true);
        }
      } catch {
        const fallback = cached ?? legacy;
        if (!cancelled) {
          setPreferences(fallback);
          applyPreferenceSideEffects(fallback);
          setLoaded(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authReady, isAuthenticated, username]);

  const updatePreferences = useCallback(
    async (patch: Partial<UserPreferences>) => {
      setPreferences((prev) => {
        const next = mergeUserPreferences(prev, patch);
        writeUserPreferencesCache(username, next);
        applyPreferenceSideEffects(next);
        return next;
      });

      if (!isAuthenticated) return;

      try {
        const saved = await patchUserPreferences(patch);
        setPreferences(saved);
        writeUserPreferencesCache(username, saved);
        applyPreferenceSideEffects(saved);
      } catch {
        /* keep optimistic local state */
      }
    },
    [isAuthenticated, username]
  );

  const value = useMemo(
    () => ({ loaded, preferences, updatePreferences }),
    [loaded, preferences, updatePreferences]
  );

  return (
    <UserPreferencesContext.Provider value={value}>
      {children}
    </UserPreferencesContext.Provider>
  );
};

export function useUserPreferences(): UserPreferencesContextValue {
  const ctx = useContext(UserPreferencesContext);
  if (!ctx) {
    throw new Error('useUserPreferences must be used within UserPreferencesProvider');
  }
  return ctx;
}

/** Convenience for language picker without importing locale types everywhere. */
export function useProfileLocale(): {
  locale: MediTapLocale;
  setLocale: (locale: MediTapLocale) => Promise<void>;
} {
  const { preferences, updatePreferences } = useUserPreferences();
  return {
    locale: preferences.locale,
    setLocale: (locale) => updatePreferences({ locale }),
  };
}

export function useProfileDarkMode(): {
  dark: boolean;
  setDark: (enabled: boolean) => Promise<void>;
} {
  const { preferences, updatePreferences } = useUserPreferences();
  return {
    dark: preferences.dark_mode,
    setDark: (enabled) => updatePreferences({ dark_mode: enabled }),
  };
}

export { DEFAULT_USER_PREFERENCES };
