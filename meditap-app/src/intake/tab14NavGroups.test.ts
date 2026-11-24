import { describe, expect, it } from 'vitest';
import { buildTab14SidebarNavForEhr } from './ehrSidebarNav';
import { groupTab14SidebarNav } from './tab14NavGroups';

describe('groupTab14SidebarNav', () => {
  it('keeps Athena/full menu order and adds family headings', () => {
    const nav = buildTab14SidebarNavForEhr('athena');
    const groups = groupTab14SidebarNav(nav);
    expect(groups.flatMap((g) => g.items.map((s) => s.key))).toEqual(nav.map((s) => s.key));
    expect(groups[0]?.label).toBe('Patient');
    expect(groups[0]?.items.map((s) => s.key)).toEqual(['demographics']);
    expect(groups.some((g) => g.label === 'Contacts')).toBe(true);
    expect(groups.some((g) => g.label === 'History')).toBe(true);
  });

  it('preserves Epic TOC order when families are interleaved', () => {
    const nav = buildTab14SidebarNavForEhr('epic');
    const groups = groupTab14SidebarNav(nav);
    expect(groups.flatMap((g) => g.items.map((s) => s.key))).toEqual(nav.map((s) => s.key));
    expect(groups[0]?.items[0]?.key).toBe('demographics');
    expect(groups.find((g) => g.items.some((s) => s.key === 'patientInstructions'))?.label).toBe(
      'Visit'
    );
  });

  it('omits headings for families the EHR hid', () => {
    const nav = buildTab14SidebarNavForEhr('meditech');
    const groups = groupTab14SidebarNav(nav);
    const keys = groups.flatMap((g) => g.items.map((s) => s.key));
    expect(keys).not.toContain('obstetricsHistory');
    expect(keys).not.toContain('imagingResults');
    expect(groups.some((g) => g.items.some((s) => s.key === 'allergies'))).toBe(true);
  });
});
