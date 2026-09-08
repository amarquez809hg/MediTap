import { describe, expect, it } from 'vitest';
import {
  collectEpicSectionBodies,
  countEpicTocSectionHits,
} from './epicMyHealthSummaryToc';
import {
  buildEpicMayoSectionCorpus,
  collectEpicMayoSectionBodies,
  parseEpicMayoAllergies,
  preprocessEpicMayoMyHealthSummaryText,
} from './epicMayoMyHealthSummaryParse';

const MULTI = `
Patient Health Summary

Allergies - as of 01/01/2025
Active Allergy Reactions Criticality Noted Date Comments
Penicillins Rash High 01/01/2020

Medications - as of 01/01/2025
Medication Sig Dispense Quantity Last Filled Start Date End Date Status
alendronate (Fosamax) 70 mg tablet Take 1 tablet by mouth every 7 days Active

Active Problems - as of 01/01/2025
Osteoporosis 01/15/2019

Encounter Details
Date: 05/12/2026
Type: Office Visit
Department: Neurology
Care Team: Orhun Kantarci, M.D.

Allergies - documented as of this encounter
Penicillamine Rash Medium 05/08/2026

Medications - documented as of this encounter
rosuvastatin (Crestor) 10 mg tablet Take 1 tablet by mouth daily Active

Active Problems - documented as of this encounter
No known active problems.

Allergies - as of 08/01/2026
Active Allergy Reactions Criticality Noted Date Comments
Penicillins Rash High 01/01/2020
Sulfa Hives Medium 03/03/2021

Medications - as of 08/01/2026
Medication Sig Last Filled Status
ibuprofen 200 mg tablet Take 1 tablet by mouth as needed Active

Encounters - as of 08/07/2026
Date Type Department Care Team Description
08/05/2026
4:00 PM
CDT
Office Visit Department of Neurology
Orhun Kantarci, M.D.
`;

describe('Epic Mayo section corpus (Encounters pattern for every TOC section)', () => {
  it('does not truncate the extract in preprocess', () => {
    const huge = `${MULTI}\n`.repeat(2) + 'Results - as of 08/01/2026\nWBC 5.0\n';
    const out = preprocessEpicMayoMyHealthSummaryText(huge);
    expect(out.length).toBe(huge.replace(/\r\n/g, '\n').length);
  });

  it('indexes Allergies / Medications / Active Problems multi-hit like Encounter Details', () => {
    expect(collectEpicMayoSectionBodies(MULTI, 'Allergies').length).toBeGreaterThanOrEqual(2);
    expect(collectEpicMayoSectionBodies(MULTI, 'Medications').length).toBeGreaterThanOrEqual(2);
    expect(collectEpicMayoSectionBodies(MULTI, 'Active Problems').length).toBeGreaterThanOrEqual(1);
    expect(collectEpicSectionBodies(MULTI, 'Allergies').length).toBeGreaterThanOrEqual(2);
  });

  it('merges allergy rows across as-of + encounter-local inventories', () => {
    const rows = parseEpicMayoAllergies(MULTI);
    const names = rows.map((r) => r.allergyName.toLowerCase());
    expect(names.some((n) => n.includes('penicillin'))).toBe(true);
    expect(names.some((n) => n.includes('sulfa') || n.includes('penicillamine'))).toBe(true);
  });

  it('builds a labeled corpus covering established TOC titles', () => {
    const corpus = buildEpicMayoSectionCorpus(MULTI);
    expect(corpus).toMatch(/Allergies/i);
    expect(corpus).toMatch(/Medications/i);
    expect(corpus).toMatch(/Encounters - as of/i);
  });

  it('counts hits for established TOC titles', () => {
    const counts = countEpicTocSectionHits(MULTI);
    expect(counts['Allergies']).toBeGreaterThanOrEqual(2);
    expect(counts['Medications']).toBeGreaterThanOrEqual(2);
    expect(counts['Encounter Details']).toBeGreaterThanOrEqual(1);
  });
});
