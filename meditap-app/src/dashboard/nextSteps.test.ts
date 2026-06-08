import { describe, expect, it } from 'vitest';
import type { DashboardDetail } from '../api';
import { patientHasBasicProfile } from './nextSteps';

function detail(
  overrides: Partial<DashboardDetail> = {}
): DashboardDetail {
  const base: DashboardDetail = {
    id: 'p1',
    name: 'Rafael Santos',
    email: 'rafael@example.com',
    healthSummary: {
      bmi: '—',
      lmd: '—',
      lastVisit: '—',
      allergies: 0,
      medications: 2,
    },
    patientProfile: {
      patientId: 'p1',
      fullName: 'Rafael Santos',
      dateOfBirth: '1955-08-08',
      email: 'rafael@example.com',
      phone: '(713) 555-0902',
      bloodType: 'AB+',
      sexAtBirth: 'Male',
    },
    allergies: [],
    medications: [],
    chronicConditions: [],
    insurance: [],
    hospital: null,
  };
  return {
    ...base,
    ...overrides,
    patientProfile: {
      ...base.patientProfile,
      ...(overrides.patientProfile ?? {}),
    },
  };
}

describe('patientHasBasicProfile', () => {
  it('returns true when server chart has name and DOB', () => {
    expect(patientHasBasicProfile(detail())).toBe(true);
  });

  it('returns false when chart is missing on server', () => {
    expect(
      patientHasBasicProfile(
        detail({
          id: 'Not created yet',
          name: 'Patient',
          patientProfile: {
            patientId: 'Not created yet',
            fullName: '—',
            dateOfBirth: '—',
            email: '—',
            phone: '—',
            bloodType: '—',
            sexAtBirth: '—',
          },
        })
      )
    ).toBe(false);
  });

  it('returns false when DOB is empty even if localStorage had a draft', () => {
    expect(
      patientHasBasicProfile(
        detail({
          patientProfile: {
            patientId: 'p1',
            fullName: 'Rafael Santos',
            dateOfBirth: '—',
            email: '—',
            phone: '—',
            bloodType: '—',
            sexAtBirth: '—',
          },
        })
      )
    ).toBe(false);
  });
});
