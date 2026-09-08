import { describe, expect, it } from 'vitest';
import {
  computeIntakeCompleteness,
  formatIntakeCompletenessSummary,
} from './intakeCompleteness';

describe('intakeCompleteness', () => {
  it('scores empty intake low', () => {
    const result = computeIntakeCompleteness({
      patient: {},
      insurances: [],
      allergies: [],
      noAllergies: false,
      medications: [],
      noMedications: false,
      chronicConditions: [],
      noChronicConditions: false,
      hospitalVisits: [],
    });
    expect(result.scorePercent).toBe(0);
    expect(result.missingLabels.length).toBeGreaterThan(3);
  });

  it('scores core demographics + none flags highly', () => {
    const result = computeIntakeCompleteness({
      patient: {
        givenName: 'Jordan',
        familyName: 'Parker',
        dateOfBirth: '1992-08-17',
        email: 'jordan@example.com',
        bloodType: 'A+',
      },
      insurances: [
        {
          ...{
            providerName: 'Aetna',
            policyNumber: '1',
            planName: '',
            memberID: '',
            groupNumber: '',
            startDate: '',
            endDate: '',
            payerId: '',
            guarantor: '',
            memberName: '',
            relationToSubscriber: '',
            subscriberName: '',
            subscriberId: '',
            subscriberDob: '',
            billingAddress: '',
          },
        },
      ],
      allergies: [],
      noAllergies: true,
      medications: [],
      noMedications: true,
      chronicConditions: [],
      noChronicConditions: true,
      hospitalVisits: [],
    });
    expect(result.scorePercent).toBeGreaterThanOrEqual(90);
    expect(formatIntakeCompletenessSummary(result)).toMatch(/completeness/);
  });
});
