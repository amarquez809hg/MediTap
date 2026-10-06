import type { PatientLabPanelApi } from '../api';
import type { Tab14LabPanel, Tab14LabPanelCategory } from '../intake/tab14IntakeTypes';

export type LabResultLineItem = {
  name: string;
  value?: number;
  textValue?: string;
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
  category?: Tab14LabPanelCategory;
  notes?: string;
  clinicalIndication?: string;
  impression?: string;
  accessionNumber?: string;
  modality?: string;
  signedBy?: string;
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
    category: (p.category as Tab14LabPanelCategory) || 'lab',
    notes: p.notes || undefined,
    clinicalIndication: p.clinical_indication || undefined,
    impression: p.impression || undefined,
    accessionNumber: p.accession_number || undefined,
    modality: p.modality || undefined,
    signedBy: p.signed_by || undefined,
    results: p.components.map((c) => ({
      name: c.name,
      value: c.value,
      textValue: c.textValue,
      unit: c.unit,
      range: c.range,
      critical: c.critical,
      interpretation: c.interpretation,
    })),
  };
}

export function collectedOnForApi(raw?: string | null): string {
  const t = (raw || '').trim();
  const m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) {
    return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  }
  const parsed = Date.parse(t);
  if (!Number.isNaN(parsed)) {
    return new Date(parsed).toISOString().slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

export function mapTab14LabPanelToApi(
  panel: Tab14LabPanel,
  index: number,
  patientId: string
): PatientLabPanelApi {
  return {
    lab_panel_id: `snapshot-${index}`,
    patient: patientId,
    display_code: panel.displayCode || `PDF-${index + 1}`,
    test_name: panel.testName,
    collected_on: panel.date || '',
    status: panel.status,
    is_new: Boolean(panel.isNew),
    category: panel.category || 'lab',
    notes: panel.notes || null,
    clinical_indication: panel.clinicalIndication || null,
    impression: panel.impression || null,
    accession_number: panel.accessionNumber || null,
    modality: panel.modality || null,
    signed_by: panel.signedBy || null,
    components: (panel.components || []).map((c) => ({
      name: c.name,
      value: c.value,
      textValue: c.textValue,
      unit: c.unit,
      range: c.range,
      critical: !!c.critical,
      interpretation: c.interpretation,
    })),
  };
}

export function mapTab14LabPanelToRow(panel: Tab14LabPanel, index: number): LabResultRow {
  return {
    id: panel.displayCode || `PDF-${index + 1}`,
    displayCode: panel.displayCode || null,
    testName: panel.testName,
    date: panel.date,
    status: panel.status,
    isNew: panel.isNew,
    category: panel.category,
    notes: panel.notes,
    clinicalIndication: panel.clinicalIndication,
    impression: panel.impression,
    accessionNumber: panel.accessionNumber,
    modality: panel.modality,
    signedBy: panel.signedBy,
    results: panel.components.map((c) => ({
      name: c.name,
      value: c.value,
      textValue: c.textValue,
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
    category: 'lab',
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
    category: 'lab',
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
    category: 'lab',
    results: [],
  },
];
