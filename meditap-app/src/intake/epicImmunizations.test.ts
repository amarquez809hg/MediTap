import { describe, expect, it } from 'vitest';
import {
  parseEpicImmunizationShots,
  truncateEpicImmunizationsBody,
} from './epicImmunizations';
import { parseEpicMayoImmunizations } from './epicMayoMyHealthSummaryParse';
import { buildEpicSectionOccurrenceList } from './epicSectionOccurrences';

const COVER = `
Immunizations HZV (ZOSTAVAX) (Given 7/25/2013) Influenza TIV (IM) (Given 10/1/2025) Influenza, Unspecified (Given 9/1/2025) PCV13 (Given 7/25/2013) PPSV23 (Given 9/1/2025) SARS-COV-2 (COVID-19) - PFIZER Fall Seasonal (5-11 YEARS) (Given 10/1/2025) Tdap (Given 5/15/2026, 7/25/2013) Social History Tobacco Use Types Packs/Day
`;

const ASOF = `
Immunizations - as of 08/07/2026 Immunization Administration Dates Next Due HZV (ZOSTAVAX) 07/25/2013 Influenza TIV (IM) 10/01/2025 Influenza, Unspecified 09/01/2025 PCV13 07/25/2013 PPSV23 09/01/2025 SARS-COV-2 (COVID-19) - PFIZER Fall Seasonal (5-11 YEARS) 10/01/2025 Tdap 05/15/2026, 07/25/2013
Social History - as of 08/07/2026 Smoking Tobacco: Never
`;

describe('Epic immunizations Name + Given Date', () => {
  it('truncates Social History bleed', () => {
    const cut = truncateEpicImmunizationsBody(COVER);
    expect(cut).toMatch(/Tdap \(Given/);
    expect(cut).not.toMatch(/Social History|Tobacco/i);
  });

  it('parses cover (Given …) rows with nested parentheses in names', () => {
    const shots = parseEpicImmunizationShots(COVER);
    expect(shots.length).toBe(7);
    expect(shots[0]).toMatchObject({ name: 'HZV (ZOSTAVAX)', givenDate: '7/25/2013' });
    expect(shots.some((s) => /SARS-COV-2/i.test(s.name) && s.givenDate === '10/1/2025')).toBe(
      true
    );
    expect(shots.find((s) => s.name === 'Tdap')?.givenDate).toBe('5/15/2026, 7/25/2013');
  });

  it('parses as-of administration table', () => {
    const shots = parseEpicImmunizationShots(ASOF);
    expect(shots.length).toBe(7);
    expect(shots.every((s) => s.name && s.givenDate)).toBe(true);
    expect(shots.some((s) => s.name === 'PCV13')).toBe(true);
  });

  it('Mayo parse returns clean clinical entries without header junk', () => {
    const sample = `
Patient Health Summary, generated on Aug. 07, 2026
${COVER}
Encounters - as of 08/07/2026
08/06/2026 Hospital Encounter Lab
08/05/2026 Office Visit Neurology
08/04/2026 Comprehensive Visit Ophthalmology
${ASOF}
`;
    const rows = parseEpicMayoImmunizations(sample);
    expect(rows.length).toBe(7);
    expect(rows.every((r) => !/Administration Dates|Immunizations - as of/i.test(r.title))).toBe(
      true
    );
    expect(rows[0]!.title).toMatch(/HZV|Influenza|PCV|Tdap|SARS/i);
  });

  it('multi-hit occurrences carry structured immunization shots', () => {
    const sample = `
Patient Health Summary, generated on Aug. 07, 2026
${COVER}
Encounters - as of 08/07/2026
08/06/2026 Hospital Encounter Lab
08/05/2026 Office Visit Neurology
08/04/2026 Comprehensive Visit Ophthalmology
07/23/2026 Telemedicine Neurology
05/12/2026 Appointment Neurology
${ASOF}
`;
    const list = buildEpicSectionOccurrenceList(sample, 'Immunizations', 'immunizations');
    expect(list.length).toBeGreaterThanOrEqual(6);
    expect(list[0]!.immunizationShots?.length).toBe(7);
    expect(list[0]!.previewLines[0]).toMatch(/HZV \(ZOSTAVAX\) —/);
    expect(list[0]!.body).not.toMatch(/Social History|Hunger Vital/i);
  });
});
