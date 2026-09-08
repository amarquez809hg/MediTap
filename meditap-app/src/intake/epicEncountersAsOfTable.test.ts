import { describe, expect, it } from 'vitest';
import {
  parseEpicEncountersAsOfTable,
  parseEpicMayoEncounters,
} from './epicMayoMyHealthSummaryParse';

const SAMPLE = `
Patient Health Summary, generated on Aug. 07, 2026

Encounter Details
Date Type Department Care Team (Latest Contact Info) Description
08/05/2026
4:00 PM
CDT
Office Visit Department of Neurology in
Rochester, Minnesota
Orhun Kantarci, M.D.

Allergies - documented as of this encounter
Penicillins Rash

Encounters - as of 08/07/2026
Date Type Department Care Team Description
08/06/2026
8:31 AM
CDT -
08/06/2026
11:59 PM
CDT
Hospital
Encounter
Department of Laboratory
Medicine and Pathology
Derek Rupp, APRN, C.N.P.,
D.N.P.
Discharge Disposition: Home or
Self Care
08/06/2026
8:00 AM
CDT
Comprehensive
Visit
Division of Rheumatology in
Rochester, Minnesota
Delamo Bekele, M.B.B.S.
08/05/2026
4:00 PM
CDT
Office Visit Department of Neurology in
Rochester, Minnesota
Orhun Kantarci, M.D.
08/04/2026
8:00 AM
CDT
Comprehensive
Visit
Department of Ophthalmology
Kevin Chodnicki, M.D.
07/23/2026
3:00 PM
CDT
Telemedicine Department of Neurology
Orhun Kantarci, M.D.
05/12/2026
8:00 AM
CDT
Appointment
Department of Neurology
Orhun Kantarci, M.D.
`;

describe('Epic Encounters - as of table (full visit inventory)', () => {
  it('extracts many visits even when Encounter Details text-layer hits are sparse', () => {
    const table = parseEpicEncountersAsOfTable(SAMPLE);
    expect(table.visits.length).toBeGreaterThanOrEqual(5);
    expect(table.visits.some((v) => /Hospital Encounter/i.test(v.visitType ?? ''))).toBe(true);
    expect(table.visits.some((v) => /Comprehensive Visit/i.test(v.visitType ?? ''))).toBe(true);
    expect(table.visits.some((v) => /Appointment/i.test(v.visitType ?? ''))).toBe(true);
  });

  it('merges table inventory over a single Encounter Details session', () => {
    const { visits } = parseEpicMayoEncounters(SAMPLE);
    // Must not stop at the lone Encounter Details block (regression: early-return → 1 visit).
    expect(visits.length).toBeGreaterThanOrEqual(5);
  });
});
