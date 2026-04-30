import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getApiBase } from '../config/api';
import { emitSessionExpired, subscribeSessionExpired } from '../auth/sessionEvents';
import { parseRealmRoles } from '../auth/realmRoles';
import {
  clearStoredTokens,
  getStoredAccessToken,
  getStoredRefreshToken,
  setStoredTokens,
} from '../auth/tokenStorage';
import { parseJwtPayload } from '../auth/accessTokenClaims';
import { clearMediTapWorkflowLocalState } from '../auth/clearWorkflowLocalState';
import { ensureFreshAccessToken } from '../auth/ensureFreshAccessToken';

interface AuthContextValue {
  /** True after initial token hydrate / refresh attempt (SPA may render routes). */
  authReady: boolean;
  authInitError: string | null;
  isAuthenticated: boolean;
  username: string | null;
  /** From JWT; Django admin uses a separate session login on the API host. */
  isStaff: boolean;
  isSuperuser: boolean;
  realmRoles: string[];
  hasRealmRole: (role: string) => boolean;
  sessionExpired: boolean;
  dismissSessionExpired: () => void;
  /** Django JWT login (username + password). */
  loginWithPassword: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function usernameFromPayload(p: Record<string, unknown> | null): string | null {
  if (!p) return null;
  const u =
    (typeof p.preferred_username === 'string' && p.preferred_username) ||
    (typeof p.username === 'string' && p.username) ||
    (typeof p.email === 'string' && p.email) ||
    null;
  return u;
}

function boolJwtClaim(p: Record<string, unknown> | null, key: string): boolean {
  if (!p) return false;
  const v = p[key];
  return v === true || v === 'true' || v === 1;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authReady, setAuthReady] = useState(false);
  const [authInitError, setAuthInitError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [realmRoles, setRealmRoles] = useState<string[]>([]);
  const [isStaff, setIsStaff] = useState(false);
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

  const applyTokenPayload = useCallback((access: string) => {
    const p = parseJwtPayload(access);
    setUsername(usernameFromPayload(p));
    setRealmRoles(parseRealmRoles(p ?? undefined));
    setIsStaff(boolJwtClaim(p, 'is_staff'));
    setIsSuperuser(boolJwtClaim(p, 'is_superuser'));
  }, []);

  useEffect(() => {
    return subscribeSessionExpired(() => {
      clearMediTapWorkflowLocalState();
      clearStoredTokens();
      setIsAuthenticated(false);
      setUsername(null);
      setRealmRoles([]);
      setIsStaff(false);
      setIsSuperuser(false);
      setSessionExpired(true);
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (getStoredRefreshToken()) {
          await ensureFreshAccessToken(5);
        }
        if (cancelled) return;
        const access = getStoredAccessToken();
        if (access) {
          setIsAuthenticated(true);
          applyTokenPayload(access);
        } else {
          setIsAuthenticated(false);
          setUsername(null);
          setRealmRoles([]);
          setIsStaff(false);
          setIsSuperuser(false);
        }
        setAuthInitError(null);
      } catch (e) {
        if (!cancelled) {
          setAuthInitError(
            e instanceof Error ? e.message : 'Could not restore sign-in session.'
          );
          setIsAuthenticated(false);
          setUsername(null);
          setRealmRoles([]);
          setIsStaff(false);
          setIsSuperuser(false);
        }
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyTokenPayload]);

  const loginWithPassword = useCallback(
    async (user: string, password: string) => {
      setAuthInitError(null);
      const base = getApiBase();
      if (!base) {
        setAuthInitError('API base URL is not configured (set VITE_API_BASE).');
        throw new Error('no api base');
      }
      const r = await fetch(`${base}/api/auth/token/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: user.trim(), password }),
      });
      if (!r.ok) {
        let detail = 'Sign-in failed.';
        try {
          const j = (await r.json()) as { detail?: string };
          if (typeof j.detail === 'string') detail = j.detail;
        } catch {
          /* ignore */
        }
        setAuthInitError(detail);
        throw new Error(detail);
      }
      const data = (await r.json()) as { access: string; refresh: string };
      clearMediTapWorkflowLocalState();
      setStoredTokens(data.access, data.refresh);
      setSessionExpired(false);
      setIsAuthenticated(true);
      applyTokenPayload(data.access);
    },
    [applyTokenPayload]
  );

  const logout = useCallback(() => {
    clearMediTapWorkflowLocalState();
    clearStoredTokens();
    setIsAuthenticated(false);
    setUsername(null);
    setRealmRoles([]);
    setIsStaff(false);
    setIsSuperuser(false);
    try {
      window.location.assign(`${window.location.origin}/tab3`);
    } catch {
      /* ignore */
    }
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
      authReady,
      authInitError,
      isAuthenticated,
      username,
      isStaff,
      isSuperuser,
      realmRoles,
      hasRealmRole,
      sessionExpired,
      dismissSessionExpired,
      loginWithPassword,
      logout,
    }),
    [
      authReady,
      authInitError,
      isAuthenticated,
      username,
      isStaff,
      isSuperuser,
      realmRoles,
      hasRealmRole,
      sessionExpired,
      dismissSessionExpired,
      loginWithPassword,
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
