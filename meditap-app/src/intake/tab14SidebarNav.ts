/**
 * Tab14 left-menu order — dedicated module so Vite/HMR cannot keep a stale
 * merged "Care Team" entry from an older tab14PortabilitySections binding.
 *
 * Order rules:
 * - Care Team Members sits between Related Person and Assessment
 * - Care Team (NPI table) is the last item (after Notes)
 */

import type { Tab14NavSection } from './tab14PortabilitySections';
import { TAB14_PORTABILITY_NAV, tab14NavLabel } from './tab14PortabilitySections';

function isCareTeamMembers(s: Tab14NavSection): boolean {
  return s.key === 'careTeamMembers';
}

function isEndCareTeam(s: Tab14NavSection): boolean {
  return s.key === 'careTeam';
}

/**
 * Normalize sidebar nav for the Care Team Members / Care Team split.
 * Safe if an old HMR graph still has a single merged `careTeam` row.
 */
export function buildTab14SidebarNav(): Tab14NavSection[] {
  const src = TAB14_PORTABILITY_NAV;
  const hasMembers = src.some(isCareTeamMembers);
  const endCare = src.find(isEndCareTeam);
  const endIsLast = src.length > 0 && isEndCareTeam(src[src.length - 1]!);

  if (hasMembers && endCare && endIsLast) {
    return src;
  }

  const out: Tab14NavSection[] = [];
  for (const s of src) {
    // Stale merged entry: pdf listed both sections under one `careTeam` key
    if (
      s.key === 'careTeam' &&
      s.pdfSections.includes('Care Team Members') &&
      s.pdfSections.includes('Care Team')
    ) {
      out.push({
        id: 9,
        key: 'careTeamMembers',
        labelKey: 'patientIntake.sections.careTeamMembers',
        icon: 'fa-user-md',
        pdfSections: ['Care Team Members'],
        legacy: false,
      });
      continue;
    }
    if (isEndCareTeam(s)) continue;
    out.push(s);
  }

  out.push({
    id: 30,
    key: 'careTeam',
    labelKey: 'patientIntake.sections.careTeam',
    icon: 'fa-users',
    pdfSections: ['Care Team'],
    legacy: false,
  });

  return out;
}

export { tab14NavLabel };
export type { Tab14NavSection };
