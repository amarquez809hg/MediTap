import { describe, expect, it } from 'vitest';
import {
  EPIC_MY_HEALTH_SUMMARY_TOC,
  countEpicTocSectionHits,
  findEpicSectionHits,
  indexEpicTocSections,
  pickEpicSectionBodies,
} from './epicMyHealthSummaryToc';

const MULTI_SECTION_SAMPLE = `
Mrs. Jane A. Smith-Doe
Patient Health Summary, generated on Aug. 07, 2026

Patient Demographics Female; born Mar. 15, 1976
Sex: Female
Marital Status: Married

Allergies - as of 08/01/2026
Active Allergy Reactions Criticality Noted Date Comments
Penicillins Rash High Criticality 01/01/2020

Medications - as of 08/01/2026
Medication Sig Last Filled Status
alendronate (Fosamax) 70 mg tablet Active

Active Problems - as of 08/01/2026
Osteoporosis Noted 2019

Immunizations - as of 08/01/2026
HZV (ZOSTAVAX) 07/25/2013

Results - as of 08/01/2026
CBC - Final result (08/01/2026)
WBC 5.0

Encounter Details
Date: 05/12/2026, 8:00 AM CDT
Type: Comprehensive Visit
Department: Department of Neurology
Care Team: Orhun Kantarci, M.D.

Allergies - documented as of this encounter (statuses as of 08/07/2026)
Penicillamine Rash

Medications - documented as of this encounter (statuses as of 08/07/2026)
rosuvastatin (Crestor) 10 mg tablet Active

Results - documented as of this encounter
Glucose 99

Encounter Details
Date: 03/01/2026, 10:00 AM CST
Type: Office Visit
Department: Department of Neurology
Care Team: Derek Rupp, APRN, C.N.P., D.N.P.

Allergies - documented as of this encounter
Penicillins Rash

Medications - as of 07/15/2026
ibuprofen 200 mg tablet Active
`;

describe('Epic TOC section indexer (all established titles)', () => {
  it('indexes hits for every TOC title that appears', () => {
    const index = indexEpicTocSections(MULTI_SECTION_SAMPLE);
    expect(index['Encounter Details']!.length).toBe(2);
    expect(index['Allergies']!.length).toBeGreaterThanOrEqual(3);
    expect(index['Medications']!.length).toBeGreaterThanOrEqual(3);
    expect(index['Active Problems']!.length).toBeGreaterThanOrEqual(1);
    expect(index['Results']!.length).toBeGreaterThanOrEqual(2);
    expect(index['Immunizations']!.length).toBeGreaterThanOrEqual(1);
  });

  it('classifies plain / as-of / encounter-local kinds', () => {
    const allergyHits = findEpicSectionHits(MULTI_SECTION_SAMPLE, 'Allergies');
    expect(allergyHits.some((h) => h.kind === 'asOf')).toBe(true);
    expect(allergyHits.some((h) => h.kind === 'encounterLocal')).toBe(true);
    expect(allergyHits.every((h) => h.key === 'allergies')).toBe(true);
  });

  it('picks primary as-of body and lists encounter-local copies', () => {
    const picked = pickEpicSectionBodies(MULTI_SECTION_SAMPLE, 'Allergies');
    expect(picked.hitCount).toBeGreaterThanOrEqual(3);
    expect(picked.primary).toMatch(/Penicillins/i);
    expect(picked.primary).toMatch(/as of 08\/01\/2026/i);
    expect(picked.encounterLocal.length).toBeGreaterThanOrEqual(2);
    expect(picked.encounterLocal.some((b) => /Penicillamine/i.test(b))).toBe(true);
  });

  it('prefers latest Medications - as of over encounter-local for primary', () => {
    const picked = pickEpicSectionBodies(MULTI_SECTION_SAMPLE, 'Medications');
    expect(picked.primary).toMatch(/ibuprofen|alendronate|Fosamax/i);
    expect(picked.encounterLocal.some((b) => /Crestor|rosuvastatin/i.test(b))).toBe(true);
  });

  it('counts hits across established TOC titles', () => {
    const counts = countEpicTocSectionHits(MULTI_SECTION_SAMPLE);
    expect(counts['Encounter Details']).toBe(2);
    expect(counts['Allergies']).toBeGreaterThanOrEqual(3);
    for (const entry of EPIC_MY_HEALTH_SUMMARY_TOC) {
      expect(counts[entry.title]).toBeDefined();
    }
  });

  it('looks up by Tab14 key as well as title', () => {
    const byKey = findEpicSectionHits(MULTI_SECTION_SAMPLE, 'allergies');
    const byTitle = findEpicSectionHits(MULTI_SECTION_SAMPLE, 'Allergies');
    expect(byKey.length).toBe(byTitle.length);
  });
});

describe('Epic mid-line section headers (glued PDF text)', () => {
  it('indexes Allergies - as of when glued after prior sentence', async () => {
    const { findEpicSectionHits, collectEpicSectionBodies } = await import('./epicMyHealthSummaryToc');
    const sample =
      'Care Team: Orhun Kantarci, M.D., Ph.D. Allergies - as of 08/07/2026 Active Allergy Reactions Criticality Noted Date Comments Penicillamine Rash Medium 05/08/2026 Penicillins Rash 07/23/2013 Medications - as of 08/07/2026 Medication Sig';
    const hits = findEpicSectionHits(sample, 'Allergies');
    expect(hits.length).toBeGreaterThanOrEqual(1);
    expect(hits[0]!.kind).toBe('asOf');
    expect(collectEpicSectionBodies(sample, 'Allergies').join(' ')).toMatch(/Penicillamine/i);
    expect(findEpicSectionHits(sample, 'Medications').length).toBeGreaterThanOrEqual(1);
  });
});
