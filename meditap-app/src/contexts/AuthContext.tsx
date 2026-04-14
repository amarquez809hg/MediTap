import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Keycloak from 'keycloak-js';
import {
  getKeycloak,
  getKeycloakGoogleIdpHint,
  getPostLoginPath,
} from '../config/keycloak';
import { emitSessionExpired, subscribeSessionExpired } from '../auth/sessionEvents';
import { parseRealmRoles } from '../auth/keycloakRoles';
import { clearMeditapIntakeElevation } from '../auth/staffElevationStorage';

interface AuthContextValue {
  keycloakReady: boolean;
  authInitError: string | null;
  isAuthenticated: boolean;
  username: string | null;
  /** Realm roles from the current access token (`realm_access.roles`). */
  realmRoles: string[];
  /** Case-sensitive realm role check. */
  hasRealmRole: (role: string) => boolean;
  /** True when refresh/API indicates the session must be renewed (show global modal). */
  sessionExpired: boolean;
  dismissSessionExpired: () => void;
  /** Redirect browser to Keycloak login, then back to the app. */
  loginWithKeycloak: () => void;
  /** Force Keycloak login screen (e.g. switch to a staff account with different roles). */
  loginWithKeycloakFresh: () => void;
  /** Keycloak self-registration (enable “User registration” on the realm). */
  registerWithKeycloak: () => void;
  /** Sign in via Google (Keycloak Identity Provider broker; configure realm IdP first). */
  loginWithGoogle: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);
let keycloakInitPromise: Promise<boolean> | null = null;

function redirectUri(): string {
  return `${window.location.origin}${getPostLoginPath()}`;
}

function syncHandlers(
  kc: InstanceType<typeof Keycloak>,
  setAuthenticated: (v: boolean) => void,
  setUsername: (v: string | null) => void,
  setSessionExpired: (v: boolean) => void,
  setRealmRoles: (roles: string[]) => void
) {
  const syncRoles = () => {
    if (kc.authenticated && kc.tokenParsed) {
      setRealmRoles(parseRealmRoles(kc.tokenParsed as Record<string, unknown>));
    } else {
      setRealmRoles([]);
    }
  };

  kc.onAuthSuccess = () => {
    setSessionExpired(false);
    setAuthenticated(!!kc.authenticated);
    const p = kc.tokenParsed as Record<string, unknown> | undefined;
    const u =
      (typeof p?.preferred_username === 'string' && p.preferred_username) ||
      (typeof p?.email === 'string' && p.email) ||
      null;
    setUsername(u);
    syncRoles();
  };
  kc.onAuthLogout = () => {
    setSessionExpired(false);
    setAuthenticated(false);
    setUsername(null);
    setRealmRoles([]);
  };
  kc.onAuthRefreshSuccess = () => {
    setAuthenticated(!!kc.authenticated);
    syncRoles();
  };
  kc.onTokenExpired = () => {
    void kc.updateToken(30).catch(() => {
      emitSessionExpired();
    });
  };
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [keycloakReady, setKeycloakReady] = useState(false);
  const [authInitError, setAuthInitError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [realmRoles, setRealmRoles] = useState<string[]>([]);
  const [sessionExpired, setSessionExpired] = useState(false);

  useEffect(() => {
    return subscribeSessionExpired(() => {
      const kc = getKeycloak();
      if (typeof kc.clearToken === 'function') {
        kc.clearToken();
      }
      setIsAuthenticated(false);
      setUsername(null);
      setRealmRoles([]);
      clearMeditapIntakeElevation();
      setSessionExpired(true);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    const kc = getKeycloak();
    syncHandlers(
      kc,
      setIsAuthenticated,
      setUsername,
      setSessionExpired,
      setRealmRoles
    );

    (async () => {
      try {
        if (!keycloakInitPromise) {
          keycloakInitPromise = kc.init({
            onLoad: 'check-sso',
            pkceMethod: 'S256',
            silentCheckSsoRedirectUri: `${window.location.origin}/silent-check-sso.html`,
            checkLoginIframe: false,
          });
        }
        const ok = await keycloakInitPromise;
        if (cancelled) return;
        setIsAuthenticated(!!ok && !!kc.authenticated);
        if (kc.authenticated && kc.tokenParsed) {
          const p = kc.tokenParsed as Record<string, unknown>;
          const u =
            (typeof p.preferred_username === 'string' && p.preferred_username) ||
            (typeof p.email === 'string' && p.email) ||
            null;
          setUsername(u);
          setRealmRoles(parseRealmRoles(p));
        } else {
          setRealmRoles([]);
        }
        setAuthInitError(null);
      } catch (e) {
        if (!cancelled) {
          setAuthInitError(
            e instanceof Error ? e.message : 'Could not connect to Keycloak.'
          );
          setIsAuthenticated(false);
          setUsername(null);
          setRealmRoles([]);
        }
      } finally {
        if (!cancelled) setKeycloakReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const loginWithKeycloak = useCallback(() => {
    const kc = getKeycloak();
    void kc.login({ redirectUri: redirectUri() });
  }, []);

  const loginWithKeycloakFresh = useCallback(() => {
    const kc = getKeycloak();
    void kc.login({ redirectUri: redirectUri(), prompt: 'login' });
  }, []);

  const registerWithKeycloak = useCallback(() => {
    const kc = getKeycloak();
    void kc.register({ redirectUri: redirectUri() });
  }, []);

  const loginWithGoogle = useCallback(() => {
    const kc = getKeycloak();
    void kc.login({
      redirectUri: redirectUri(),
      idpHint: getKeycloakGoogleIdpHint(),
      // Keycloak ends your app session on logout, but Google may still have a browser
      // session. These ask Keycloak / the broker path to treat auth as fresh so Google
      // shows account selection or sign-in again instead of silent SSO.
      prompt: 'login',
      maxAge: 0,
    });
  }, []);

  const logout = useCallback(() => {
    clearMeditapIntakeElevation();
    const kc = getKeycloak();
    void kc.logout({ redirectUri: redirectUri() });
  }, []);

  const dismissSessionExpired = useCallback(() => {
    setSessionExpired(false);
  }, []);

  const hasRealmRole = useCallback(
    (role: string) => realmRoles.includes(role),
    [realmRoles]
  );

  const value = useMemo(
    () => ({
      keycloakReady,
      authInitError,
      isAuthenticated,
      username,
      realmRoles,
      hasRealmRole,
      sessionExpired,
      dismissSessionExpired,
      loginWithKeycloak,
      loginWithKeycloakFresh,
      registerWithKeycloak,
      loginWithGoogle,
      logout,
    }),
    [
      keycloakReady,
      authInitError,
      isAuthenticated,
      username,
      realmRoles,
      hasRealmRole,
      sessionExpired,
      dismissSessionExpired,
      loginWithKeycloak,
      loginWithKeycloakFresh,
      registerWithKeycloak,
      loginWithGoogle,
      logout,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
