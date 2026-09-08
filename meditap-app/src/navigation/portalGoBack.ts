/**
 * Portal “Go back” / forward nav — shared hard-navigation helpers.
 *
 * IonRouterOutlet often ignores soft history.push / <Link> between sibling
 * /app/* routes. Always navigate via window.location.assign
 * (see docs/PORTAL_GO_BACK_MATRIX.md).
 */

import { getAdminSelectedPatientId } from '../portals/adminPatientStorage';
import {
  ADMIN_PATIENT_VIEW_BASE,
  ADMIN_PATIENT_VIEW_PATHS,
} from '../portals/adminPatientViewPaths';
import { LEGACY_TAB_REDIRECTS, USER_PORTAL_HOME } from '../portals/portalPaths';

export function pathnameOf(key: string): string {
  return key.split(/[?#]/)[0] || key;
}

export function pathKey(pathname: string, search: string, hash: string): string {
  return `${pathname}${search}${hash}`;
}

/** Pick previous stack entry, or fallback when empty / same page. */
export function resolveGoBackTarget(
  stack: string[],
  currentPathname: string,
  currentKey: string,
  fallback: string
): string {
  const copy = stack.slice();
  while (copy.length > 0) {
    const top = copy[copy.length - 1];
    if (top === currentKey || pathnameOf(top) === currentPathname) {
      copy.pop();
    } else {
      break;
    }
  }
  const prev = copy[copy.length - 1];
  return prev && pathnameOf(prev) !== currentPathname ? prev : fallback;
}

/** Hard navigation — required for reliable leave from Ionic stacked pages. */
export function navigatePortalHard(target: string): void {
  if (typeof window === 'undefined') return;
  window.location.assign(target);
}

const APP_TO_EMBED: Record<string, string> = {
  '/app/dashboard': ADMIN_PATIENT_VIEW_PATHS.dashboard,
  '/app/status': ADMIN_PATIENT_VIEW_PATHS.status,
  '/app/appointments': ADMIN_PATIENT_VIEW_PATHS.appointments,
  '/app/conditions': ADMIN_PATIENT_VIEW_PATHS.conditions,
  '/app/incidents': ADMIN_PATIENT_VIEW_PATHS.incidents,
  '/app/labs': ADMIN_PATIENT_VIEW_PATHS.labs,
  '/app/insurance': ADMIN_PATIENT_VIEW_PATHS.insurance,
  '/app/intake': ADMIN_PATIENT_VIEW_PATHS.intake,
  '/app/settings': ADMIN_PATIENT_VIEW_PATHS.settings,
};

/**
 * Normalize legacy /tabN → /app/… and, when already in the admin embed,
 * keep navigation inside `/admin-portal/patient-view/*`.
 */
export function resolvePortalHref(href: string): string {
  const raw = (href || '').trim();
  if (!raw || raw.startsWith('http://') || raw.startsWith('https://')) {
    return raw;
  }

  const hashIdx = raw.indexOf('#');
  const hash = hashIdx >= 0 ? raw.slice(hashIdx) : '';
  const withoutHash = hashIdx >= 0 ? raw.slice(0, hashIdx) : raw;
  const qIdx = withoutHash.indexOf('?');
  const search = qIdx >= 0 ? withoutHash.slice(qIdx) : '';
  const path = qIdx >= 0 ? withoutHash.slice(0, qIdx) : withoutHash;

  let nextPath = LEGACY_TAB_REDIRECTS[path] || path;

  if (typeof window !== 'undefined') {
    const here = window.location.pathname;
    if (here === ADMIN_PATIENT_VIEW_BASE || here.startsWith(`${ADMIN_PATIENT_VIEW_BASE}/`)) {
      nextPath = APP_TO_EMBED[nextPath] || nextPath;
    }
  }

  return `${nextPath}${search}${hash}`;
}

/** Resolve then hard-navigate (patient tab ↔ tab and admin embed). */
export function navigatePortal(href: string): void {
  navigatePortalHard(resolvePortalHref(href));
}

/**
 * Fallback when history stack is empty on a chart/clinical tab.
 * Prefers admin patient hub when staff has a chart selected.
 */
export function chartPageGoBackFallback(): string {
  const id = getAdminSelectedPatientId();
  if (id) return `/admin-portal/patients/${id}`;
  return USER_PORTAL_HOME;
}

/** Preferred back target when leaving a chart page with an admin patient selected. */
export function adminChartFallback(patientId: string | null | undefined): string | null {
  if (!patientId) return null;
  return `/admin-portal/patients/${patientId}`;
}
