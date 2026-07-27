/**
 * Clean portal paths + legacy /tabN redirects (Phase 1 portal split).
 * See docs/PORTAL_SPLIT_DECISIONS.md
 */

export const USER_PORTAL_HOME = '/app/dashboard';
export const ADMIN_PORTAL_HOME = '/admin-portal/home';
export const LOGIN_PATH = '/tab3';

/** Legacy tab path → new portal path */
export const LEGACY_TAB_REDIRECTS: Record<string, string> = {
  '/tab1': '/app/dashboard',
  '/tab2': '/app/status',
  '/tab4': '/app/appointments',
  '/tab5': '/app/conditions',
  '/tab6': '/app/incidents',
  '/tab7': '/app/labs',
  '/tab11': '/app/settings',
  '/tab12': '/app/insurance',
  '/tab13': '/admin-portal/panel',
  '/tab14': '/app/intake',
};

export type PortalHome = 'user' | 'admin';

export function homePathForPortal(portalHome: PortalHome): string {
  return portalHome === 'admin' ? ADMIN_PORTAL_HOME : USER_PORTAL_HOME;
}

/** Map a path (legacy or new) to the preferred post-login home when role is known. */
export function resolvePostLoginPath(portalHome: PortalHome): string {
  return homePathForPortal(portalHome);
}
