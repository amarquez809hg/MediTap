import { describe, expect, it } from 'vitest';
import {
  countExtendedEntries,
  extendedSectionsFromSnapshot,
  mergeSnapshotIntoClinicalSnapshot,
  pickRichestParseSnapshot,
} from './restoreParseSnapshot';
import { emptyExtendedSections } from './tab14PortabilitySections';
import { emptyMergeSnapshot } from './applyTab14ParseBundle';

describe('restoreParseSnapshot', () => {
  it('picks the snapshot with the richest extended sections', () => {
    const empty = {
      created_at: '2026-10-01T10:00:00Z',
      parse_snapshot: { patientFields: { givenName: 'A' } },
    };
    const rich = {
      created_at: '2026-10-01T09:00:00Z',
      parse_snapshot: {
        extendedSections: {
          ...emptyExtendedSections(),
          relatedPerson: [{ title: 'Taylor', detail: 'Spouse', date: '', recordedBy: '', place: '', time: '', notes: '' }],
          planOfTreatment: [
            { title: 'free T4', detail: '', date: '2024-01-01', recordedBy: '', place: '', time: '', notes: '', category: 'Lab' },
          ],
        },
        allergies: [{ allergyName: 'Penicillin' }],
      },
    };
    const picked = pickRichestParseSnapshot([empty, rich]);
    expect(picked?.extendedSections?.relatedPerson?.[0]?.title).toBe('Taylor');
    expect(extendedSectionsFromSnapshot(picked)?.planOfTreatment).toHaveLength(1);
    expect(countExtendedEntries(extendedSectionsFromSnapshot(picked))).toBe(2);
  });

  it('fills empty API clinical rows from snapshot', () => {
    const api = emptyMergeSnapshot();
    const merged = mergeSnapshotIntoClinicalSnapshot(api, {
      allergies: [{ allergyName: 'Penicillin', severity: 'High' } as never],
      medications: [{ genericName: 'Lisinopril' } as never],
      noKnownDrugAllergies: false,
    });
    expect(merged.allergies[0]?.allergyName).toBe('Penicillin');
    expect(merged.medications[0]?.genericName).toBe('Lisinopril');
  });

  it('prefers a richer PDF medication list over a sparse API row', () => {
    const api = {
      ...emptyMergeSnapshot(),
      medications: [{ genericName: 'metformin', brandName: '', dosage: '500 mg' } as never],
    };
    const merged = mergeSnapshotIntoClinicalSnapshot(api, {
      medications: [
        { genericName: 'metformin' } as never,
        { genericName: 'lisinopril' } as never,
        { genericName: 'atorvastatin' } as never,
        { genericName: 'aspirin' } as never,
        { genericName: 'gabapentin' } as never,
        { genericName: 'cholecalciferol (Vitamin D3)' } as never,
        { genericName: 'ibuprofen' } as never,
        { genericName: 'amoxicillin' } as never,
      ],
    });
    expect(merged.medications.length).toBeGreaterThanOrEqual(8);
    expect(merged.medications.some((m) => /lisinopril/i.test(m.genericName))).toBe(true);
  });
});
