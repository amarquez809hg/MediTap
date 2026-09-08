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
import {
  portalIdentityFromJwt,
  portalIdentityFromLegacyFlags,
  type PortalIdentity,
  type PortalRole,
} from '../portals/portalIdentity';
import type { PortalHome } from '../portals/portalPaths';

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
  /** Portal split Phase 1 — role / home / permissions from JWT (or legacy fallback). */
  portalIdentity: PortalIdentity;
  portalRole: PortalRole;
  portalHome: PortalHome;
  permissions: string[];
  sessionExpired: boolean;
  dismissSessionExpired: () => void;
  /**
   * Django JWT login. Returns portal home for redirect.
   * If `requirePortalHome` is set and the account does not match, tokens are not kept
   * and an Error is thrown (message should be set by the caller for i18n).
   */
  loginWithPassword: (
    username: string,
    password: string,
    opts?: { requirePortalHome?: PortalHome }
  ) => Promise<PortalHome>;
  /**
   * Clear session. By default redirects to the patient login door.
   * Pass `redirectTo: null` to stay on the current page (e.g. wrong-portal rejection).
   */
  logout: (opts?: { redirectTo?: string | null }) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const EMPTY_PORTAL: PortalIdentity = {
  role: 'patient',
  portalHome: 'user',
  orgIds: [],
  permissions: [],
};

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
  const [portalIdentity, setPortalIdentity] = useState<PortalIdentity>(EMPTY_PORTAL);
  const [sessionExpired, setSessionExpired] = useState(false);

  const applyTokenPayload = useCallback((access: string) => {
    const p = parseJwtPayload(access);
    const roles = parseRealmRoles(p ?? undefined);
    const staff = boolJwtClaim(p, 'is_staff');
    const superuser = boolJwtClaim(p, 'is_superuser');
    setUsername(usernameFromPayload(p));
    setRealmRoles(roles);
    setIsStaff(staff);
    setIsSuperuser(superuser);
    const fromJwt = portalIdentityFromJwt(p);
    if (p && typeof p.portal_role === 'string') {
      setPortalIdentity(fromJwt);
    } else {
      setPortalIdentity(
        portalIdentityFromLegacyFlags({
          isStaff: staff,
          isSuperuser: superuser,
          realmRoles: roles,
        })
      );
    }
  }, []);

  useEffect(() => {
    return subscribeSessionExpired(() => {
      clearMediTapWorkflowLocalState();
      try {
        sessionStorage.removeItem('meditap_last_username');
      } catch {
        /* ignore */
      }
      clearStoredTokens();
      setIsAuthenticated(false);
      setUsername(null);
      setRealmRoles([]);
      setIsStaff(false);
      setIsSuperuser(false);
      setPortalIdentity(EMPTY_PORTAL);
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
          setPortalIdentity(EMPTY_PORTAL);
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
          setPortalIdentity(EMPTY_PORTAL);
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
    async (
      user: string,
      password: string,
      opts?: { requirePortalHome?: PortalHome }
    ): Promise<PortalHome> => {
      setAuthInitError(null);
      const base = getApiBase();
      if (!base) {
        setAuthInitError('API base URL is not configured (set VITE_API_BASE).');
        throw new Error('no api base');
      }
      try {
        const r = await fetch(`${base}/api/auth/token/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: user.trim(), password }),
        });
        if (!r.ok) {
          let detail = 'Login failed.';
          try {
            const j = (await r.json()) as Record<string, unknown>;
            if (typeof j.detail === 'string') detail = j.detail;
            else if (Array.isArray(j.non_field_errors) && j.non_field_errors.length) {
              const first = j.non_field_errors[0];
              detail = typeof first === 'string' ? first : detail;
            }
          } catch {
            /* ignore */
          }
          setAuthInitError(detail);
          throw new Error(detail);
        }
        const data = (await r.json()) as { access: string; refresh: string };
        const p = parseJwtPayload(data.access);
        const roles = parseRealmRoles(p ?? undefined);
        const staff = boolJwtClaim(p, 'is_staff');
        const superuser = boolJwtClaim(p, 'is_superuser');
        const identity =
          p && typeof p.portal_role === 'string'
            ? portalIdentityFromJwt(p)
            : portalIdentityFromLegacyFlags({
                isStaff: staff,
                isSuperuser: superuser,
                realmRoles: roles,
              });

        if (opts?.requirePortalHome && identity.portalHome !== opts.requirePortalHome) {
          // Do not persist a wrong-door session (e.g. patient on admin login).
          clearStoredTokens();
          const mismatch = new Error('PORTAL_MISMATCH');
          (mismatch as Error & { portalHome: PortalHome }).portalHome = identity.portalHome;
          throw mismatch;
        }

        const nextUser = user.trim().toLowerCase();
        const prevUser = sessionStorage.getItem('meditap_last_username');
        if (!prevUser || prevUser !== nextUser) {
          clearMediTapWorkflowLocalState();
        }
        sessionStorage.setItem('meditap_last_username', nextUser);
        setStoredTokens(data.access, data.refresh);
        setSessionExpired(false);
        setIsAuthenticated(true);
        applyTokenPayload(data.access);
        return identity.portalHome;
      } catch (e) {
        if (e instanceof Error && e.message === 'PORTAL_MISMATCH') {
          throw e;
        }
        const isNetwork =
          e instanceof TypeError ||
          (e instanceof Error && /network|fetch|load failed|failed to fetch/i.test(e.message));
        const hint =
          isNetwork && (base.includes('127.0.0.1') || base.includes('localhost'))
            ? ' Start the API on this Mac (port 8080 by default). From the MediTap repo: cd docker && docker compose up -d. Restart the Django container after pulling so CORS allows the iOS app (capacitor://localhost). On a physical iPhone, build with VITE_API_BASE set to your Mac’s LAN IP (e.g. http://192.168.1.10:8080).'
            : '';
        const msg = isNetwork
          ? `Could not reach the API at ${base}.${hint}${e instanceof Error ? ` (${e.message})` : ''}`
          : e instanceof Error
            ? e.message
            : 'Login failed.';
        setAuthInitError(msg);
        throw e instanceof Error ? e : new Error(msg);
      }
    },
    [applyTokenPayload]
  );

  const logout = useCallback((opts?: { redirectTo?: string | null }) => {
    clearMediTapWorkflowLocalState();
    try {
      sessionStorage.removeItem('meditap_last_username');
    } catch {
      /* ignore */
    }
    clearStoredTokens();
    setIsAuthenticated(false);
    setUsername(null);
    setRealmRoles([]);
    setIsStaff(false);
    setIsSuperuser(false);
    setPortalIdentity(EMPTY_PORTAL);
    setAuthInitError(null);
    const redirectTo = opts && 'redirectTo' in opts ? opts.redirectTo : '/tab3';
    if (redirectTo == null) return;
    try {
      window.location.assign(`${window.location.origin}${redirectTo}`);
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
      portalIdentity,
      portalRole: portalIdentity.role,
      portalHome: portalIdentity.portalHome,
      permissions: portalIdentity.permissions,
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
      portalIdentity,
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
