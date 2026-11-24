import { describe, expect, it } from 'vitest';
import type { LabResultRow } from '../labResults/labResultModel';
import type { Tab14LabPanel } from './tab14IntakeTypes';
import {
  clinicalEntriesFromLabResultRows,
  clinicalEntriesFromTab14LabPanels,
  labResultRowsFromClinicalEntries,
} from './resultsClinicalEntries';
import { TAB14_PORTABILITY_NAV } from './tab14PortabilitySections';

describe('resultsClinicalEntries (MT-AG-205)', () => {
  it('marks Results as a non-legacy portability nav section', () => {
    const results = TAB14_PORTABILITY_NAV.find((s) => s.key === 'results');
    expect(results?.legacy).toBe(false);
  });

  it('maps lab panels into extended Result cards with analyte detail', () => {
    const panels: Tab14LabPanel[] = [
      {
        testName: 'SureSwab',
        displayCode: 'SS-1',
        date: '2025-08-21',
        status: 'Final',
        isNew: true,
        category: 'lab',
        components: [
          {
            name: 'Candida',
            textValue: 'Negative',
            unit: '',
            range: '',
            critical: false,
          },
          {
            name: 'BV',
            value: 1,
            unit: '',
            range: '0–1',
            critical: false,
            interpretation: 'Positive',
          },
        ],
      },
    ];
    const entries = clinicalEntriesFromTab14LabPanels(panels);
    expect(entries).toHaveLength(1);
    expect(entries[0]?.title).toBe('SureSwab');
    expect(entries[0]?.date).toBe('2025-08-21');
    expect(entries[0]?.status).toBe('Final');
    expect(entries[0]?.code).toBe('SS-1');
    expect(entries[0]?.detail).toMatch(/Candida/);
    expect(entries[0]?.detail).toMatch(/BV/);
  });

  it('round-trips Result cards back to lab rows preserving prior components', () => {
    const prior: LabResultRow[] = [
      {
        id: 'PDF-1',
        testName: 'CBC',
        date: '2025-01-01',
        status: 'Final',
        isNew: false,
        category: 'lab',
        results: [
          {
            name: 'Hemoglobin',
            value: 14.5,
            unit: 'g/dL',
            range: '13.5–17.5',
            critical: false,
          },
        ],
      },
    ];
    const entries = clinicalEntriesFromLabResultRows(prior);
    entries[0]!.status = 'Reviewed';
    const back = labResultRowsFromClinicalEntries(entries, prior);
    expect(back[0]?.status).toBe('Reviewed');
    expect(back[0]?.results[0]?.name).toBe('Hemoglobin');
    expect(back[0]?.results[0]?.value).toBe(14.5);
  });
});
