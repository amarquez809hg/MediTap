import { describe, expect, it } from 'vitest';
import { parseEpicMayoInsurance } from './epicMayoMyHealthSummaryParse';
import { parseTab14IntakeDocument } from './tab14DocumentParse';

describe('parseEpicMayoInsurance', () => {
  it('maps Primary insurance narrative into a Payers row and skips N/A secondary', () => {
    const text = `
**FINANCES/INSURANCE**
Primary insurance: FEDERAL BCBS STANDARD
Secondary insurance: N/A
Financial concerns: No
**ADVANCE DIRECTIVES**
`;
    const rows = parseEpicMayoInsurance(text);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.providerName).toMatch(/FEDERAL\s+BCBS\s+STANDARD/i);
    expect(rows[0]?.planName).toMatch(/^Primary:/i);
  });

  it('keeps a named secondary plan when present', () => {
    const text = `
Primary insurance: FEDERAL BCBS STANDARD
Secondary insurance: Medicare Part B
`;
    const rows = parseEpicMayoInsurance(text);
    expect(rows).toHaveLength(2);
    expect(rows[1]?.providerName).toMatch(/Medicare\s+Part\s+B/i);
  });

  it('fills Tab14 payers when Epic Mayo dialect runs', () => {
    const text = `
My Health Summary
Mayo Clinic
Allergies - as of 05/14/2026
No known active allergies
Medications - as of 05/14/2026
Not on file
Active Problems - as of 05/14/2026
Not on file
Last Filed Vital Signs - as of 05/14/2026
Blood Pressure 126 / 82
**FINANCES/INSURANCE**
Primary insurance: FEDERAL BCBS STANDARD
Secondary insurance: N/A
`;
    const parsed = parseTab14IntakeDocument(text, { preferredVendor: 'epic' });
    expect(parsed.insurances.some((r) => /FEDERAL\s+BCBS/i.test(r.providerName))).toBe(true);
  });
});
