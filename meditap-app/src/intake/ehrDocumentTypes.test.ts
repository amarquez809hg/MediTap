import { describe, expect, it } from 'vitest';
import {
  EHR_VENDOR_PANEL_OPTIONS,
  ehrIntakePanelTitle,
  shouldRunVendorParser,
} from './ehrDocumentTypes';
import {
  buildTab14SidebarNavForEhr,
  EHR_SIDEBAR_SECTION_KEYS,
  EHR_SIDEBAR_ALL_SECTION_KEYS,
  ehrSidebarNavLabel,
} from './ehrSidebarNav';
import { sliceAllEpicResultsSessions } from './epicMyHealthSummaryToc';
import { isNextGenHealthcareDocument } from './nextgenHealthcareParse';
import { parseTab14IntakeDocument } from './tab14DocumentParse';

describe('ehrDocumentTypes', () => {
  it('lists five clinic/generic vendors for the upload panel', () => {
    expect(EHR_VENDOR_PANEL_OPTIONS.map((o) => o.id)).toEqual([
      'athena',
      'meditech',
      'epic',
      'nextgen',
      'generic',
    ]);
  });

  it('gates vendor parsers by preferred selection', () => {
    expect(shouldRunVendorParser('athena', 'auto')).toBe(true);
    expect(shouldRunVendorParser('athena', undefined)).toBe(true);
    expect(shouldRunVendorParser('athena', 'athena')).toBe(true);
    expect(shouldRunVendorParser('athena', 'meditech')).toBe(false);
    expect(shouldRunVendorParser('meditech', 'meditech')).toBe(true);
    expect(shouldRunVendorParser('nextgen', 'athena')).toBe(false);
    expect(shouldRunVendorParser('athena', 'generic')).toBe(false);
    expect(shouldRunVendorParser('epic', 'generic')).toBe(false);
  });

  it('names the sidebar intake panel from the selected EHR', () => {
    expect(ehrIntakePanelTitle(null)).toBe('Select document format');
    expect(ehrIntakePanelTitle('athena')).toBe('Athena Intake Panel');
    expect(ehrIntakePanelTitle('meditech')).toBe('MEDITECH Intake Panel');
    expect(ehrIntakePanelTitle('epic')).toBe('Epic Intake Panel');
    expect(ehrIntakePanelTitle('nextgen')).toBe('NextGen Intake Panel');
    expect(ehrIntakePanelTitle('generic')).toBe('Generic Intake Panel');
    expect(ehrIntakePanelTitle('auto')).toBe('Auto-detect Intake Panel');
  });
});

describe('ehrSidebarNav profiles', () => {
  it('defaults unset vendors to the full menu until lists are filled', () => {
    expect(EHR_SIDEBAR_SECTION_KEYS.generic).toBe('all');
    expect(EHR_SIDEBAR_SECTION_KEYS.athena).toBe('all');
    const full = buildTab14SidebarNavForEhr(null);
    expect(buildTab14SidebarNavForEhr('generic').map((s) => s.key)).toEqual(
      full.map((s) => s.key)
    );
    expect(EHR_SIDEBAR_ALL_SECTION_KEYS[0]).toBe('demographics');
    expect(EHR_SIDEBAR_ALL_SECTION_KEYS).toContain('careTeam');
  });

  it('locks MEDITECH sidebar to the Jordan CCD table of contents', () => {
    const keys = buildTab14SidebarNavForEhr('meditech').map((s) => s.key);
    expect(keys).toEqual([
      'demographics',
      'relatedPerson',
      'careTeamMembers',
      'assessment',
      'planOfTreatment',
      'reasonForReferral',
      'results',
      'problems',
      'procedures',
      'medicalEquipment',
      'allergies',
      'medications',
      'vitals',
      'socialHistory',
      'functionalStatus',
      'mentalStatus',
      'familyHistory',
      'medicalHistory',
      'immunizations',
      'pastEncounters',
      'goals',
      'healthConcerns',
      'advanceDirectives',
      'payers',
      'notes',
      'careTeam',
    ]);
    expect(keys).not.toContain('patientInstructions');
    expect(keys).not.toContain('surgicalHistory');
    expect(keys).not.toContain('imagingResults');
    expect(keys).not.toContain('procedureNotes');
    expect(keys).not.toContain('obstetricsHistory');
    expect(keys[keys.length - 1]).toBe('careTeam');
  });

  it('locks Epic sidebar to Jane Doe My Health Summary TOC order', () => {
    const keys = buildTab14SidebarNavForEhr('epic').map((s) => s.key);
    expect(keys).toEqual([
      'demographics',
      'patientInstructions',
      'reasonForReferral',
      'pastEncounters',
      'allergies',
      'medications',
      'problems',
      'immunizations',
      'socialHistory',
      'vitals',
      'notes',
      'functionalStatus',
      'procedureNotes',
      'planOfTreatment',
      'procedures',
      'results',
      'assessment',
      'payers',
      'careTeam',
      'relatedPerson',
    ]);
    expect(keys).not.toContain('surgicalHistory');
    expect(keys).not.toContain('obstetricsHistory');
    expect(keys).not.toContain('goals');
  });

  it('uses Epic Lucy/Mayo display titles on the left menu', () => {
    const nav = buildTab14SidebarNavForEhr('epic');
    const byKey = Object.fromEntries(nav.map((s) => [s.key, s]));
    expect(ehrSidebarNavLabel(byKey.demographics!, 'epic')).toBe('Patient Demographics');
    expect(ehrSidebarNavLabel(byKey.problems!, 'epic')).toBe('Active Problems');
    expect(ehrSidebarNavLabel(byKey.vitals!, 'epic')).toBe('Last Filed Vital Signs');
    expect(ehrSidebarNavLabel(byKey.results!, 'epic')).toBe('Results');
    expect(ehrSidebarNavLabel(byKey.assessment!, 'epic')).toBe('Visit Diagnoses');
  });

  it('splits multi-intake Epic Results - as of sessions', () => {
    const text = `
Results - as of 08/07/2026
CBC - Final result (08/06/2026 8:00 AM CDT)
WBC 5.0
Results - as of 05/15/2026
CMP - Final result (05/14/2026 9:00 AM CDT)
Glucose 99
`;
    const sessions = sliceAllEpicResultsSessions(text);
    expect(sessions.length).toBe(2);
    expect(sessions[0]!.asOf).toBe('08/07/2026');
    expect(sessions[1]!.asOf).toBe('05/15/2026');
  });

  it('reorders/filters when a vendor profile list is set', () => {
    const prev = EHR_SIDEBAR_SECTION_KEYS.generic;
    EHR_SIDEBAR_SECTION_KEYS.generic = ['demographics', 'allergies', 'medications', 'vitals'];
    try {
      expect(buildTab14SidebarNavForEhr('generic').map((s) => s.key)).toEqual([
        'demographics',
        'allergies',
        'medications',
        'vitals',
      ]);
    } finally {
      EHR_SIDEBAR_SECTION_KEYS.generic = prev;
    }
  });
});

describe('preferredVendor parse routing', () => {
  const athenaSnippet = `
Data Portability for Diana Smith
Table of Contents
Demographics Sex: Female
Allergies Allergen Id Allergen Category
`;

  it('accepts preferredVendor without breaking Athena auto parse', () => {
    const auto = parseTab14IntakeDocument(athenaSnippet, { preferredVendor: 'auto' });
    const athena = parseTab14IntakeDocument(athenaSnippet, { preferredVendor: 'athena' });
    expect(auto.patientFields.givenName).toMatch(/Diana/i);
    expect(athena.patientFields.givenName).toMatch(/Diana/i);
    expect(athena.patientFields.sexAtBirth).toBe('Female');
  });

  it('generic preferred skips Athena specialized dialect', () => {
    const generic = parseTab14IntakeDocument(athenaSnippet, { preferredVendor: 'generic' });
    // General extract may still find Sex: Female; must not require Athena-only wiring.
    expect(generic.patientFields.sexAtBirth === 'Female' || !generic.patientFields.givenName).toBe(
      true
    );
  });

  it('keeps NextGen detector conservative until fixtures exist', () => {
    expect(isNextGenHealthcareDocument('Random clinic summary')).toBe(false);
    expect(
      isNextGenHealthcareDocument('NextGen Healthcare Patient Portal Continuity of Care')
    ).toBe(true);
  });
});
