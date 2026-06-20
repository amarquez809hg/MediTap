import { describe, expect, it } from 'vitest';
import {
  latestEncounterNoteHospitalVisit,
  matchEncounterNotes,
} from './encounterNoteHospitalParse';

describe('encounterNoteHospitalParse', () => {
  it('parses facilities containing the letter C (e.g. Clinic, Community)', () => {
    const text = `ENCOUNTER NOTE 1 Date: 2026-02-04 Facility: North Valley Clinic Chief Complaint: Follow-up and review of active problems. Subjective: Patient reports symptoms.
ENCOUNTER NOTE 5 Date: 2026-06-16 Facility: Downtown Specialty Group Chief Complaint: Follow-up and review of active problems. Subjective: Patient reports symptoms.`;

    const rows = matchEncounterNotes(text);
    expect(rows).toHaveLength(2);
    expect(rows[0].facilityName).toBe('North Valley Clinic');
    expect(rows[1].visitDate).toBe('2026-06-16');
    expect(rows[1].facilityName).toBe('Downtown Specialty Group');
  });

  it('returns the latest encounter by date, not document order', () => {
    const text = `ENCOUNTER NOTE 6 Date: 2026-01-19 Facility: North Valley Clinic Chief Complaint: Follow-up and review of active problems. Subjective: Stable.
ENCOUNTER NOTE 5 Date: 2026-06-16 Facility: Downtown Specialty Group Chief Complaint: Follow-up and review of active problems. Subjective: Stable.`;

    const visit = latestEncounterNoteHospitalVisit(text);
    expect(visit.visitDate).toBe('2026-06-16');
    expect(visit.facilityName).toBe('Downtown Specialty Group');
    expect(visit.reason).toMatch(/Follow-up/i);
    expect(visit.visitType).toBe('Follow-up');
  });
});
