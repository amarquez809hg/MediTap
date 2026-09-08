import type { PortalHome } from './portalPaths';

export type PortalRole = 'patient' | 'staff' | 'org_admin';

export interface PortalIdentity {
  role: PortalRole;
  portalHome: PortalHome;
  orgIds: string[];
  permissions: string[];
}

const DEFAULT_IDENTITY: PortalIdentity = {
  role: 'patient',
  portalHome: 'user',
  orgIds: [],
  permissions: [],
};

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === 'string');
}

function asPortalRole(v: unknown): PortalRole {
  if (v === 'staff' || v === 'org_admin' || v === 'patient') return v;
  return 'patient';
}

function asPortalHome(v: unknown, role: PortalRole): PortalHome {
  if (v === 'admin' || v === 'user') return v;
  return role === 'patient' ? 'user' : 'admin';
}

/** Build portal identity from JWT payload claims (Phase 1). */
export function portalIdentityFromJwt(
  payload: Record<string, unknown> | null | undefined
): PortalIdentity {
  if (!payload) return { ...DEFAULT_IDENTITY };

  const role = asPortalRole(payload.portal_role);
  const portalHome = asPortalHome(payload.portal_home, role);
  return {
    role,
    portalHome,
    orgIds: asStringArray(payload.org_ids),
    permissions: asStringArray(payload.permissions),
  };
}

/** Fallback when older tokens lack portal_* claims. */
export function portalIdentityFromLegacyFlags(opts: {
  isStaff: boolean;
  isSuperuser: boolean;
  realmRoles: string[];
}): PortalIdentity {
  const hasEditor = opts.realmRoles.some(
    (r) => r === 'meditap-record-editor' || r.toLowerCase().includes('record-editor')
  );
  if (opts.isSuperuser) {
    return {
      role: 'org_admin',
      portalHome: 'admin',
      orgIds: [],
      permissions: [],
    };
  }
  if (opts.isStaff || hasEditor) {
    return {
      role: 'staff',
      portalHome: 'admin',
      orgIds: [],
      permissions: [],
    };
  }
  return { ...DEFAULT_IDENTITY };
}

export function canAccessAdminPortal(identity: PortalIdentity): boolean {
  return identity.portalHome === 'admin' || identity.role === 'staff' || identity.role === 'org_admin';
}
