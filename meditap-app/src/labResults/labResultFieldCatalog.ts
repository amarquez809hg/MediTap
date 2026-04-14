/**
 * Curated lists for staff lab-entry dropdowns (common US outpatient / chemistry-style panels).
 * Reference strings are typical adult screening intervals often printed on reports; adjust locally as needed.
 */

export const CUSTOM_SELECT_VALUE = '__custom__';

/** Common orderable lab panels */
export const LAB_PANEL_OPTIONS = [
  'Complete Blood Count (CBC)',
  'Basic Metabolic Panel (BMP)',
  'Comprehensive Metabolic Panel (CMP)',
  'Lipid Panel',
  'Liver panel (hepatic function)',
  'Thyroid stimulating hormone (TSH)',
  'Hemoglobin A1c',
  'Urinalysis (UA)',
  'Coagulation (PT / INR)',
  'Vitamin D, 25-OH',
  'Iron studies (Fe, TIBC, Ferritin)',
  'Cardiac troponin',
  'BNP / NT-proBNP',
  'Magnesium',
  'Phosphorus',
  'PSA (total)',
] as const;

export type LabPanelOption = (typeof LAB_PANEL_OPTIONS)[number];

export type AnalyteRowTemplate = {
  name: string;
  unit: string;
  /** Typical adult reference string for display */
  range: string;
  /** Quick-pick numeric values staff often enters (includes mid-range examples) */
  valuePresets: number[];
};

const CBC_ANALYTES: AnalyteRowTemplate[] = [
  { name: 'Hemoglobin', unit: 'g/dL', range: '13.5–17.5 (M) / 12.0–15.5 (F)', valuePresets: [12, 13, 13.5, 14, 14.5, 15, 16] },
  { name: 'Hematocrit', unit: '%', range: '38.3–48.6 (M) / 35.9–44.5 (F)', valuePresets: [36, 38, 40, 42, 44, 45] },
  { name: 'RBC count', unit: 'M/uL', range: '4.5–5.9 (M) / 4.0–5.2 (F)', valuePresets: [4.2, 4.5, 4.8, 5.0, 5.2, 5.5] },
  { name: 'WBC Count', unit: 'K/uL', range: '4.5–11.0', valuePresets: [5, 6, 7.5, 8, 9, 9.8, 11, 12] },
  { name: 'Platelets', unit: 'K/uL', range: '150–450', valuePresets: [135, 150, 200, 250, 300, 350, 400] },
  { name: 'MCV', unit: 'fL', range: '80–96', valuePresets: [78, 82, 88, 90, 92, 96] },
  { name: 'MCH', unit: 'pg', range: '27–33', valuePresets: [27, 28, 29, 30, 31, 32] },
  { name: 'MCHC', unit: 'g/dL', range: '32–36', valuePresets: [32, 33, 34, 35] },
  { name: 'RDW', unit: '%', range: '11.5–14.5', valuePresets: [12, 13, 13.5, 14, 15] },
  { name: 'Neutrophils (%)', unit: '%', range: '40–70', valuePresets: [45, 55, 60, 65] },
  { name: 'Lymphocytes (%)', unit: '%', range: '20–40', valuePresets: [20, 25, 30, 35] },
];

const BMP_ANALYTES: AnalyteRowTemplate[] = [
  { name: 'Glucose (Fasting)', unit: 'mg/dL', range: '70–99', valuePresets: [72, 85, 92, 99, 100, 105, 115, 126, 140] },
  { name: 'BUN', unit: 'mg/dL', range: '7–20', valuePresets: [8, 10, 12, 15, 18, 22] },
  { name: 'Creatinine', unit: 'mg/dL', range: '0.7–1.3 (M) / 0.6–1.1 (F)', valuePresets: [0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.4] },
  { name: 'Sodium', unit: 'mEq/L', range: '136–145', valuePresets: [135, 138, 140, 142, 145] },
  { name: 'Potassium', unit: 'mEq/L', range: '3.5–5.1', valuePresets: [3.5, 3.8, 4.0, 4.1, 4.5, 5.0, 5.2] },
  { name: 'Chloride', unit: 'mEq/L', range: '98–107', valuePresets: [100, 102, 104, 106] },
  { name: 'CO₂ (bicarbonate)', unit: 'mEq/L', range: '22–29', valuePresets: [22, 24, 26, 28] },
  { name: 'Calcium', unit: 'mg/dL', range: '8.5–10.2', valuePresets: [8.6, 9.0, 9.5, 10.0, 10.3] },
];

const CMP_EXTRA: AnalyteRowTemplate[] = [
  { name: 'Total protein', unit: 'g/dL', range: '6.0–8.3', valuePresets: [6.5, 7.0, 7.2, 7.8] },
  { name: 'Albumin', unit: 'g/dL', range: '3.5–5.0', valuePresets: [3.5, 3.8, 4.0, 4.2, 4.5] },
  { name: 'ALP', unit: 'IU/L', range: '44–147', valuePresets: [60, 80, 100, 120] },
  { name: 'ALT', unit: 'IU/L', range: '7–56', valuePresets: [18, 22, 28, 35, 45] },
  { name: 'AST', unit: 'IU/L', range: '10–40', valuePresets: [20, 24, 28, 35] },
  { name: 'Bilirubin, total', unit: 'mg/dL', range: '0.1–1.2', valuePresets: [0.5, 0.8, 1.0, 1.2] },
];

const LIPID_ANALYTES: AnalyteRowTemplate[] = [
  { name: 'Total cholesterol', unit: 'mg/dL', range: '<200 desirable', valuePresets: [160, 180, 195, 210, 240] },
  { name: 'HDL cholesterol', unit: 'mg/dL', range: '>40 (M) / >50 (F)', valuePresets: [35, 42, 48, 55, 62] },
  { name: 'LDL cholesterol', unit: 'mg/dL', range: '<100 optimal (risk-dependent)', valuePresets: [70, 85, 99, 110, 130, 160] },
  { name: 'Triglycerides', unit: 'mg/dL', range: '<150 normal', valuePresets: [90, 120, 140, 175, 200] },
];

const LFT_ANALYTES: AnalyteRowTemplate[] = [
  { name: 'ALT', unit: 'IU/L', range: '7–56', valuePresets: [18, 25, 35, 45] },
  { name: 'AST', unit: 'IU/L', range: '10–40', valuePresets: [22, 28, 35] },
  { name: 'ALP', unit: 'IU/L', range: '44–147', valuePresets: [70, 90, 110] },
  { name: 'Total bilirubin', unit: 'mg/dL', range: '0.1–1.2', valuePresets: [0.6, 0.9, 1.1] },
  { name: 'Albumin', unit: 'g/dL', range: '3.5–5.0', valuePresets: [3.8, 4.0, 4.2] },
];

const OTHER_COMMON: AnalyteRowTemplate[] = [
  { name: 'TSH', unit: 'mIU/L', range: '0.4–4.0 (lab-specific)', valuePresets: [0.8, 1.5, 2.5, 3.5, 4.5] },
  { name: 'Free T4', unit: 'ng/dL', range: '0.8–1.8', valuePresets: [0.9, 1.0, 1.1, 1.3] },
  { name: 'Hemoglobin A1c', unit: '%', range: '<5.7% normal', valuePresets: [5.0, 5.4, 5.6, 6.0, 6.5, 7.0, 8.0] },
  { name: 'PSA (total)', unit: 'ng/mL', range: '<4.0 (age-dependent)', valuePresets: [0.5, 1.0, 2.0, 3.5, 4.5] },
  { name: 'Vitamin D, 25-OH', unit: 'ng/mL', range: '30–100 (institution-specific)', valuePresets: [22, 30, 35, 45, 60] },
  { name: 'Ferritin', unit: 'ng/mL', range: '20–250 (M) / 10–120 (F)', valuePresets: [45, 80, 120, 200] },
  { name: 'Iron', unit: 'mcg/dL', range: '60–170 (M) / 50–170 (F)', valuePresets: [65, 85, 110, 140] },
  { name: 'Troponin I', unit: 'ng/L', range: '≤ URL (assay-specific)', valuePresets: [5, 10, 14, 50, 200] },
  { name: 'BNP', unit: 'pg/mL', range: '<100 (rule-out varies)', valuePresets: [35, 80, 150, 400] },
  { name: 'INR', unit: '', range: '0.8–1.1 (not on warfarin)', valuePresets: [0.9, 1.0, 1.1, 2.0, 2.5] },
  { name: 'PT', unit: 'sec', range: '11–13.5', valuePresets: [11.5, 12.0, 12.8, 14] },
  { name: 'Magnesium', unit: 'mg/dL', range: '1.7–2.2', valuePresets: [1.7, 1.9, 2.0, 2.1] },
  { name: 'Phosphorus', unit: 'mg/dL', range: '2.5–4.5', valuePresets: [3.0, 3.5, 4.0, 4.5] },
  { name: 'Urine specific gravity', unit: '', range: '1.005–1.030', valuePresets: [1.005, 1.010, 1.015, 1.020] },
  { name: 'Urine pH', unit: '', range: '4.5–8.0', valuePresets: [5.0, 5.5, 6.0, 6.5, 7.0] },
];

const PANEL_TO_ANALYTES: Partial<Record<string, AnalyteRowTemplate[]>> = {
  'Complete Blood Count (CBC)': CBC_ANALYTES,
  'Basic Metabolic Panel (BMP)': BMP_ANALYTES,
  'Comprehensive Metabolic Panel (CMP)': [...BMP_ANALYTES, ...CMP_EXTRA],
  'Lipid Panel': LIPID_ANALYTES,
  'Liver panel (hepatic function)': LFT_ANALYTES,
};

/** All analytes for dropdown when panel is custom or not mapped */
export function getAllAnalyteTemplates(): AnalyteRowTemplate[] {
  const seen = new Set<string>();
  const out: AnalyteRowTemplate[] = [];
  for (const list of [
    CBC_ANALYTES,
    BMP_ANALYTES,
    CMP_EXTRA,
    LIPID_ANALYTES,
    LFT_ANALYTES,
    OTHER_COMMON,
  ]) {
    for (const a of list) {
      if (!seen.has(a.name)) {
        seen.add(a.name);
        out.push(a);
      }
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export function getAnalytesForPanel(panelName: string): AnalyteRowTemplate[] {
  const mapped = PANEL_TO_ANALYTES[panelName];
  if (mapped?.length) return mapped;
  return getAllAnalyteTemplates();
}

export function findAnalyteTemplate(name: string): AnalyteRowTemplate | undefined {
  const n = name.trim().toLowerCase();
  return getAllAnalyteTemplates().find((a) => a.name.toLowerCase() === n);
}

export const DISPLAY_CODE_PRESETS = [
  '',
  'L-2024-001',
  'L-2024-002',
  'L-2024-003',
  'L-2024-004',
  'L-2024-005',
  'L-2024-006',
  'L-2025-001',
  'L-2025-002',
  'L-2025-003',
  'LAB-OUT-001',
  'LAB-OUT-002',
];

export const LAB_STATUS_OPTIONS = [
  'Reviewed',
  'Pending',
  'Preliminary',
  'Final',
  'Corrected',
] as const;

export const COLLECTED_DATE_PRESETS = [
  { label: 'Use date picker →', value: '' },
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: '7 days ago', value: 'd7' },
  { label: '30 days ago', value: 'd30' },
] as const;

export function applyDatePreset(preset: string): string {
  const d = new Date();
  if (preset === 'today') return d.toISOString().slice(0, 10);
  if (preset === 'yesterday') {
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  }
  if (preset === 'd7') {
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }
  if (preset === 'd30') {
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  }
  return '';
}

export const LAB_UNIT_OPTIONS = [
  'g/dL',
  'mg/dL',
  'mmol/L',
  'mEq/L',
  'IU/L',
  'U/L',
  'K/uL',
  'M/uL',
  '%',
  'fL',
  'pg',
  'ng/dL',
  'ng/mL',
  'pg/mL',
  'mIU/L',
  'mcg/dL',
  'ng/L',
  'sec',
  '(none)',
] as const;

export const REFERENCE_RANGE_CUSTOM = '__custom_range__';

export const REFERENCE_RANGE_PRESETS = [
  '13.5–17.5',
  '4.5–11.0',
  '150–450',
  '70–99',
  '3.5–5.1',
  '0.6–1.3',
  '136–145',
  '<200 desirable',
  '30–100',
  '0.4–4.0',
  'See report',
  REFERENCE_RANGE_CUSTOM,
] as const;

export const INTERPRETATION_OPTIONS = [
  '',
  'Normal',
  'Low',
  'High',
  'Borderline',
  'Critical low',
  'Critical high',
  'Abnormal',
] as const;

export const CRITICAL_FLAG_OPTIONS = [
  { label: 'Not flagged', value: 'no' },
  { label: 'Flagged / critical', value: 'yes' },
] as const;

export const MARK_AS_NEW_OPTIONS = [
  { label: 'Yes — show “New” badge', value: 'yes' },
  { label: 'No', value: 'no' },
] as const;

export const VALUE_PRESET_CUSTOM = '__value_custom__';

/** When analyte is not in catalog */
export const GENERIC_VALUE_PRESETS = [0, 1, 5, 10, 25, 50, 75, 100, 150, 200, 300];
