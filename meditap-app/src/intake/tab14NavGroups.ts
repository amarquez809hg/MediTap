import type { Tab14NavSection, Tab14SectionKey } from './tab14PortabilitySections';

/** Clinical families for the Add Patient Information left menu. */
export type Tab14NavGroupId =
  | 'patient'
  | 'contacts'
  | 'visit'
  | 'results'
  | 'problems'
  | 'meds'
  | 'vitals'
  | 'history'
  | 'plan'
  | 'admin'
  | 'other';

export const TAB14_NAV_GROUP_LABELS: Record<Tab14NavGroupId, string> = {
  patient: 'Patient',
  contacts: 'Contacts',
  visit: 'Visit',
  results: 'Results',
  problems: 'Problems & procedures',
  meds: 'Allergies & medications',
  vitals: 'Vitals',
  history: 'History',
  plan: 'Goals & directives',
  admin: 'Coverage & notes',
  other: 'Other',
};

export const TAB14_NAV_GROUP_BY_KEY: Record<Tab14SectionKey, Tab14NavGroupId> = {
  demographics: 'patient',
  relatedPerson: 'contacts',
  careTeamMembers: 'contacts',
  careTeam: 'contacts',
  assessment: 'visit',
  planOfTreatment: 'visit',
  patientInstructions: 'visit',
  reasonForReferral: 'visit',
  results: 'results',
  imagingResults: 'problems',
  problems: 'problems',
  procedures: 'problems',
  surgicalHistory: 'problems',
  procedureNotes: 'problems',
  medicalEquipment: 'problems',
  allergies: 'meds',
  medications: 'meds',
  vitals: 'vitals',
  socialHistory: 'history',
  functionalStatus: 'history',
  mentalStatus: 'history',
  familyHistory: 'history',
  medicalHistory: 'history',
  obstetricsHistory: 'history',
  immunizations: 'history',
  pastEncounters: 'history',
  goals: 'plan',
  healthConcerns: 'plan',
  advanceDirectives: 'plan',
  payers: 'admin',
  notes: 'admin',
};

export type Tab14NavGroupBlock = {
  id: string;
  groupId: Tab14NavGroupId;
  label: string;
  items: Tab14NavSection[];
};

/**
 * Insert family headings while keeping the vendor’s existing section order.
 * The same family can appear more than once if an EHR interleaves sections.
 */
export function groupTab14SidebarNav(sections: Tab14NavSection[]): Tab14NavGroupBlock[] {
  const blocks: Tab14NavGroupBlock[] = [];
  for (const section of sections) {
    const groupId = TAB14_NAV_GROUP_BY_KEY[section.key] ?? 'other';
    const last = blocks[blocks.length - 1];
    if (last && last.groupId === groupId) {
      last.items.push(section);
      continue;
    }
    blocks.push({
      id: `${groupId}-${blocks.length}`,
      groupId,
      label: TAB14_NAV_GROUP_LABELS[groupId],
      items: [section],
    });
  }
  return blocks;
}
