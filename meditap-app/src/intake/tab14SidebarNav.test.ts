import { describe, expect, it } from 'vitest';
import { buildTab14SidebarNav } from './tab14SidebarNav';

describe('buildTab14SidebarNav', () => {
  it('places Care Team Members before Assessment and Care Team last', () => {
    const nav = buildTab14SidebarNav();
    const keys = nav.map((s) => s.key);
    const membersIdx = keys.indexOf('careTeamMembers');
    const assessIdx = keys.indexOf('assessment');
    const relatedIdx = keys.indexOf('relatedPerson');
    expect(membersIdx).toBeGreaterThan(relatedIdx);
    expect(membersIdx).toBeLessThan(assessIdx);
    expect(keys[keys.length - 1]).toBe('careTeam');
    expect(nav.find((s) => s.key === 'careTeamMembers')?.pdfSections).toEqual([
      'Care Team Members',
    ]);
    expect(nav.find((s) => s.key === 'careTeam')?.pdfSections).toEqual(['Care Team']);
  });
});
