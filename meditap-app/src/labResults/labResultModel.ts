import type { PatientLabPanelApi } from '../api';

export type LabResultLineItem = {
  name: string;
  value: number;
  unit: string;
  range: string;
  critical: boolean;
  interpretation?: string;
};

export type LabResultRow = {
  id: string;
  /** Django `lab_panel_id` when loaded from API (for edit/delete). */
  serverId?: string;
  /** Original display_code from API when present. */
  displayCode?: string | null;
  testName: string;
  date: string;
  status: string;
  isNew: boolean;
  results: LabResultLineItem[];
};

export function mapPatientLabPanelToRow(p: PatientLabPanelApi): LabResultRow {
  const display =
    (p.display_code && p.display_code.trim()) ||
    `L-${p.lab_panel_id.replace(/-/g, '').slice(0, 8).toUpperCase()}`;
  return {
    id: display,
    serverId: p.lab_panel_id,
    displayCode: p.display_code?.trim() || null,
    testName: p.test_name,
    date: p.collected_on,
    status: p.status,
    isNew: p.is_new,
    results: p.components.map((c) => ({
      name: c.name,
      value: c.value,
      unit: c.unit,
      range: c.range,
      critical: c.critical,
      interpretation: c.interpretation,
    })),
  };
}

export const mockLabResults: LabResultRow[] = [
  {
    id: 'L-2024-001',
    testName: 'Complete Blood Count (CBC)',
    date: '2025-11-05',
    status: 'Reviewed',
    isNew: true,
    results: [
      {
        name: 'Hemoglobin',
        value: 14.5,
        unit: 'g/dL',
        range: '13.5–17.5',
        critical: false,
      },
      {
        name: 'WBC Count',
        value: 9.8,
        unit: 'K/uL',
        range: '4.5–11.0',
        critical: false,
      },
      {
        name: 'Platelets',
        value: 135,
        unit: 'K/uL',
        range: '150–450',
        critical: true,
        interpretation: 'Low',
      },
    ],
  },
  {
    id: 'L-2024-002',
    testName: 'Basic Metabolic Panel (BMP)',
    date: '2025-10-10',
    status: 'Reviewed',
    isNew: false,
    results: [
      {
        name: 'Glucose (Fasting)',
        value: 115,
        unit: 'mg/dL',
        range: '70–99',
        critical: true,
        interpretation: 'High',
      },
      {
        name: 'Potassium',
        value: 4.1,
        unit: 'mmol/L',
        range: '3.5–5.1',
        critical: false,
      },
      {
        name: 'Creatinine',
        value: 0.9,
        unit: 'mg/dL',
        range: '0.6–1.3',
        critical: false,
      },
    ],
  },
  {
    id: 'L-2024-003',
    testName: 'Lipid Panel',
    date: '2025-08-15',
    status: 'Pending',
    isNew: false,
    results: [],
  },
];
