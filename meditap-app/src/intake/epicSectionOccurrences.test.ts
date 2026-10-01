import { describe, expect, it } from 'vitest';
import {
  buildEpicSectionOccurrenceList,
  buildEpicSectionPreviewLines,
  inventoryEpicSidebarSectionOccurrences,
} from './epicSectionOccurrences';

const SAMPLE = `
Patient Health Summary, generated on Aug. 07, 2026
Allergies - as of 08/07/2026
Active Allergy Reactions Criticality Noted Date Comments
Penicillamine Rash Medium Criticality 05/08/2026
Penicillins Rash Low Criticality 03/01/2025
Encounters - as of 08/07/2026
08/06/2026 Hospital Encounter Lab
08/05/2026 Office Visit Neurology
08/04/2026 Comprehensive Visit Ophthalmology
07/23/2026 Telemedicine Neurology
05/12/2026 Appointment Neurology
`;

describe('Epic generic section multi-hit', () => {
  it('builds dated Allergies intakes with sparse encounter proxy', () => {
    const list = buildEpicSectionOccurrenceList(SAMPLE, 'Allergies', 'allergies');
    expect(list.length).toBeGreaterThanOrEqual(6);
    expect(list[0]!.previewLines.some((l) => /Penicillamine/i.test(l))).toBe(true);
    expect(list[0]!.intakeDateLabel).toBeTruthy();
    expect(list.every((r) => r.total === list.length)).toBe(true);
  });

  it('filters demographics junk from allergy preview lines', () => {
    const lines = buildEpicSectionPreviewLines(
      'Allergies',
      'Never Married Sex Identity Orientation Penicillamine Rash Medium 05/08/2026'
    );
    expect(lines.every((l) => !/^Never\b/i.test(l))).toBe(true);
    expect(lines.some((l) => /Penicillamine/i.test(l))).toBe(true);
  });

  it('inventories multiple sidebar keys', () => {
    const inv = inventoryEpicSidebarSectionOccurrences(SAMPLE);
    expect(inv.byKey.allergies?.length).toBeGreaterThanOrEqual(6);
    expect(inv.countsByTitle['Allergies']).toBe(inv.byKey.allergies?.length);
    expect(inv.byKey.demographics).toBeUndefined();
    expect(inv.byKey.patientInstructions).toBeUndefined();
  });

  it('expands Encounter Details from Encounters-as-of when headers are sparse', () => {
    const sample = `
Patient Health Summary, generated on Aug. 07, 2026
Encounter Details
Date: 08/05/2026, 4:00 PM CDT
Type: Office Visit
Department: Department of Neurology in Rochester, Minnesota
Care Team: Orhun Kantarci, M.D.
Encounters - as of 08/07/2026
08/06/2026 Hospital Encounter Lab
08/05/2026 Office Visit Neurology
08/04/2026 Comprehensive Visit Ophthalmology
07/23/2026 Telemedicine Neurology
05/12/2026 Appointment Neurology
`;
    const list = buildEpicSectionOccurrenceList(sample, 'Encounter Details', 'pastEncounters');
    expect(list.length).toBeGreaterThanOrEqual(5);
    expect(list[0]!.intakeDateIso).toBeTruthy();
    expect(list.some((r) => /Office Visit|Hospital Encounter/i.test(r.visitType))).toBe(true);
  });

  it('lists Results as-of sessions and pads when visit inventory is richer', () => {
    const sample = `
Patient Health Summary, generated on Aug. 07, 2026
Results - as of 08/07/2026
DSDNA AB, IGG, S - Final result (08/06/2026 8:41 AM CDT) Component Value
Encounters - as of 08/07/2026
08/06/2026 Hospital Encounter Lab
08/05/2026 Office Visit Neurology
08/04/2026 Comprehensive Visit Ophthalmology
`;
    const list = buildEpicSectionOccurrenceList(sample, 'Results', 'results');
    expect(list.length).toBeGreaterThanOrEqual(3);
    expect(list[0]!.previewLines.some((l) => /DSDNA/i.test(l))).toBe(true);
  });
});
