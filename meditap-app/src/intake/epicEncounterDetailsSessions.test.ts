import { describe, expect, it } from 'vitest';
import {
  peekEpicEncounterDetailMeta,
  sliceEpicEncounterDetailSessions,
  sliceEpicEncounterLocalSection,
  splitEpicMyHealthSummarySessions,
} from './epicMyHealthSummaryToc';
import { parseEpicMayoEncounters } from './epicMayoMyHealthSummaryParse';

const SAMPLE = `
Mrs. Jane A. Smith-Doe
Patient Health Summary, generated on Aug. 07, 2026
Patient Demographics Female; born Mar. 15, 1976

Encounter Details
Date: 05/12/2026, 8:00 AM CDT
Type: Comprehensive Visit
Department: Department of Neurology in Rochester, Minnesota
200 First Street SW Rochester MN 55905-0001
Care Team: Orhun Kantarci, M.D.
200 First Street SW Rochester MN 55905-0001
Description:

Allergies - documented as of this encounter (statuses as of 08/07/2026)
Active Allergy Reactions Criticality Noted Date Comments
Penicillamine Rash Medium Criticality 05/08/2026

Medications - documented as of this encounter (statuses as of 08/07/2026)
Medication Sig Last Filled Status
alendronate (Fosamax) 70 mg tablet Take 1 tablet by mouth every 7 days Active

Active Problems - documented as of this encounter (statuses as of 08/07/2026)
No known active problems.

Immunizations - documented as of this encounter
Immunization Administration Dates
HZV (ZOSTAVAX) 07/25/2013

Encounter Details
Date: 03/01/2026, 10:00 AM CST
Type: Office Visit
Department: Department of Neurology in Rochester, Minnesota
Care Team: Derek Rupp, APRN, C.N.P., D.N.P.
Description:

Allergies - documented as of this encounter (statuses as of 08/07/2026)
Penicillins Rash

Medications - documented as of this encounter (statuses as of 08/07/2026)
rosuvastatin (Crestor) 10 mg tablet Active
`;

describe('Epic Encounter Details session slicing', () => {
  it('finds every Encounter Details block like PDF search', () => {
    const sessions = sliceEpicEncounterDetailSessions(SAMPLE);
    expect(sessions.length).toBe(2);
    expect(sessions[0]!.dateRaw).toMatch(/05\/12\/2026/);
    expect(sessions[0]!.visitType).toMatch(/Comprehensive Visit/i);
    expect(sessions[0]!.careTeamRaw).toMatch(/Kantarci/i);
    expect(sessions[1]!.visitType).toMatch(/Office Visit/i);
    expect(sessions[1]!.careTeamRaw).toMatch(/Rupp/i);
  });

  it('slices nested documented-as-of-this-encounter subsections', () => {
    const sessions = sliceEpicEncounterDetailSessions(SAMPLE);
    const allergies = sliceEpicEncounterLocalSection(sessions[0]!.body, 'Allergies');
    expect(allergies).toMatch(/Penicillamine/i);
    expect(allergies).not.toMatch(/rosuvastatin/i);
    const meds = sliceEpicEncounterLocalSection(sessions[0]!.body, 'Medications');
    expect(meds).toMatch(/alendronate|Fosamax/i);
  });

  it('uses Encounter Details as primary multi-intake split', () => {
    const parts = splitEpicMyHealthSummarySessions(SAMPLE);
    // cover + 2 encounters
    expect(parts.length).toBeGreaterThanOrEqual(2);
    expect(parts.some((p) => /Comprehensive Visit/i.test(p))).toBe(true);
    expect(parts.some((p) => /Office Visit/i.test(p))).toBe(true);
  });

  it('maps Encounter Details blocks into Past Encounters visits', () => {
    const { visits, careTeam } = parseEpicMayoEncounters(SAMPLE);
    expect(visits.length).toBeGreaterThanOrEqual(2);
    expect(visits[0]!.visitType).toMatch(/Comprehensive Visit/i);
    expect(visits[0]!.facilityName).toMatch(/Neurology/i);
    expect(careTeam.some((c) => /Kantarci/i.test(c.title))).toBe(true);
  });

  it('reads peek meta from a single block', () => {
    const meta = peekEpicEncounterDetailMeta(SAMPLE);
    expect(meta.dateRaw).toMatch(/05\/12\/2026/);
    expect(meta.visitType).toMatch(/Comprehensive Visit/i);
  });
});
