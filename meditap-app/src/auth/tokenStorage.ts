import type { PortalHome } from '../portals/portalPaths';

/** Shared legacy keys (pre dual-portal). Migrated once into a portal slot. */
const LEGACY_ACCESS = 'meditap_access_token';
const LEGACY_REFRESH = 'meditap_refresh_token';

type PortalTokenSlot = PortalHome;

function keysFor(slot: PortalTokenSlot): { access: string; refresh: string } {
  return {
    access: `meditap_access_token_${slot}`,
    refresh: `meditap_refresh_token_${slot}`,
  };
}

/**
 * Which auth slot this browser tab should use.
 * Patient + admin can stay signed in at once (separate localStorage keys).
 */
export function resolvePortalTokenSlot(
  pathname: string = typeof window !== 'undefined' ? window.location.pathname : '/'
): PortalTokenSlot {
  if (
    pathname.startsWith('/admin-portal') ||
    pathname.startsWith('/tab13') ||
    pathname.startsWith('/admin')
  ) {
    return 'admin';
  }
  return 'user';
}

function readJwtPortalHome(access: string): PortalTokenSlot | null {
  try {
    const part = access.split('.')[1];
    if (!part) return null;
    const json = JSON.parse(
      atob(part.replace(/-/g, '+').replace(/_/g, '/'))
    ) as Record<string, unknown>;
    if (json.portal_home === 'admin' || json.portal_home === 'user') {
      return json.portal_home;
    }
    if (json.is_staff === true || json.is_superuser === true) return 'admin';
    return 'user';
  } catch {
    return null;
  }
}

function migrateLegacyTokens(): void {
  let legacyAccess: string | null = null;
  let legacyRefresh: string | null = null;
  try {
    legacyAccess = localStorage.getItem(LEGACY_ACCESS);
    legacyRefresh = localStorage.getItem(LEGACY_REFRESH);
  } catch {
    return;
  }
  if (!legacyAccess) return;

  const home = readJwtPortalHome(legacyAccess) ?? resolvePortalTokenSlot();
  const k = keysFor(home);
  try {
    if (!localStorage.getItem(k.access)) {
      localStorage.setItem(k.access, legacyAccess);
      if (legacyRefresh) localStorage.setItem(k.refresh, legacyRefresh);
    }
    localStorage.removeItem(LEGACY_ACCESS);
    localStorage.removeItem(LEGACY_REFRESH);
  } catch {
    /* private mode / quota */
  }
}

export function getStoredAccessToken(
  slot: PortalTokenSlot = resolvePortalTokenSlot()
): string | null {
  migrateLegacyTokens();
  try {
    return localStorage.getItem(keysFor(slot).access);
  } catch {
    return null;
  }
}

export function getStoredRefreshToken(
  slot: PortalTokenSlot = resolvePortalTokenSlot()
): string | null {
  migrateLegacyTokens();
  try {
    return localStorage.getItem(keysFor(slot).refresh);
  } catch {
    return null;
  }
}

export function setStoredTokens(
  access: string,
  refresh: string,
  slot: PortalTokenSlot = resolvePortalTokenSlot()
): void {
  const k = keysFor(slot);
  try {
    localStorage.setItem(k.access, access);
    localStorage.setItem(k.refresh, refresh);
    // Drop legacy single-slot keys so they cannot overwrite the other portal.
    localStorage.removeItem(LEGACY_ACCESS);
    localStorage.removeItem(LEGACY_REFRESH);
  } catch {
    /* private mode / quota */
  }
}

/** Clear one portal slot (default: current path). Pass nothing special to wipe both. */
export function clearStoredTokens(
  slot: PortalTokenSlot | 'all' = resolvePortalTokenSlot()
): void {
  try {
    if (slot === 'all') {
      localStorage.removeItem(keysFor('user').access);
      localStorage.removeItem(keysFor('user').refresh);
      localStorage.removeItem(keysFor('admin').access);
      localStorage.removeItem(keysFor('admin').refresh);
    } else {
      const k = keysFor(slot);
      localStorage.removeItem(k.access);
      localStorage.removeItem(k.refresh);
    }
    localStorage.removeItem(LEGACY_ACCESS);
    localStorage.removeItem(LEGACY_REFRESH);
  } catch {
    /* ignore */
  }
}
