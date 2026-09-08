import { describe, expect, it } from 'vitest';
import {
  canAccessAdminPortal,
  portalIdentityFromJwt,
  portalIdentityFromLegacyFlags,
} from './portalIdentity';

describe('portalIdentity', () => {
  it('reads portal claims from JWT payload', () => {
    const id = portalIdentityFromJwt({
      portal_role: 'staff',
      portal_home: 'admin',
      org_ids: ['h1'],
      permissions: ['admin_portal:access'],
    });
    expect(id.role).toBe('staff');
    expect(id.portalHome).toBe('admin');
    expect(id.orgIds).toEqual(['h1']);
    expect(canAccessAdminPortal(id)).toBe(true);
  });

  it('defaults patients without portal claims', () => {
    const id = portalIdentityFromLegacyFlags({
      isStaff: false,
      isSuperuser: false,
      realmRoles: [],
    });
    expect(id.role).toBe('patient');
    expect(id.portalHome).toBe('user');
    expect(canAccessAdminPortal(id)).toBe(false);
  });

  it('treats staff flag as admin home', () => {
    const id = portalIdentityFromLegacyFlags({
      isStaff: true,
      isSuperuser: false,
      realmRoles: [],
    });
    expect(id.portalHome).toBe('admin');
    expect(canAccessAdminPortal(id)).toBe(true);
  });
});
