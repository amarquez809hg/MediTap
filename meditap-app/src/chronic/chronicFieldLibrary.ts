/** Staff quick-pick library for Chronic Conditions & History (Tab5). */

export type ChronicConditionPreset = {
  name: string;
  icdCode: string;
};

export const CHRONIC_CONDITION_PRESETS: ChronicConditionPreset[] = [
  { name: 'Type 2 Diabetes Mellitus', icdCode: 'E11.9' },
  { name: 'Type 1 Diabetes Mellitus', icdCode: 'E10.9' },
  { name: 'Essential (primary) hypertension', icdCode: 'I10' },
  { name: 'Hyperlipidemia, unspecified', icdCode: 'E78.5' },
  { name: 'Hypothyroidism, unspecified', icdCode: 'E03.9' },
  { name: 'Hyperthyroidism', icdCode: 'E05.90' },
  { name: 'Asthma, unspecified', icdCode: 'J45.909' },
  { name: 'COPD, unspecified', icdCode: 'J44.9' },
  { name: 'Heart failure, unspecified', icdCode: 'I50.9' },
  { name: 'Atrial fibrillation, unspecified', icdCode: 'I48.91' },
  { name: 'Coronary artery disease', icdCode: 'I25.10' },
  { name: 'Chronic kidney disease, stage 3', icdCode: 'N18.30' },
  { name: 'Gastroesophageal reflux disease', icdCode: 'K21.9' },
  { name: 'Major depressive disorder, recurrent', icdCode: 'F33.9' },
  { name: 'Generalized anxiety disorder', icdCode: 'F41.1' },
  { name: 'Obesity, unspecified', icdCode: 'E66.9' },
  { name: 'Osteoarthritis, unspecified site', icdCode: 'M19.90' },
  { name: 'Rheumatoid arthritis, unspecified', icdCode: 'M06.9' },
  { name: 'Migraine, unspecified', icdCode: 'G43.909' },
  { name: 'Epilepsy, unspecified', icdCode: 'G40.909' },
  { name: 'Anemia, unspecified', icdCode: 'D64.9' },
  { name: 'Vitamin D deficiency', icdCode: 'E55.9' },
  { name: 'Psoriasis, unspecified', icdCode: 'L40.9' },
  { name: 'Eczema / atopic dermatitis', icdCode: 'L20.9' },
  { name: 'Benign prostatic hyperplasia', icdCode: 'N40.0' },
];

export const CHRONIC_CONDITION_NAME_OPTIONS = CHRONIC_CONDITION_PRESETS.map((c) => c.name);

export const CHRONIC_ICD10_OPTIONS: string[] = [
  ...new Set([
    ...CHRONIC_CONDITION_PRESETS.map((c) => c.icdCode),
    'Z87.891',
  ]),
];

export const CHRONIC_SEVERITY_OPTIONS = [
  { value: '', label: 'Select severity' },
  { value: 'Mild', label: 'Mild' },
  { value: 'Moderate', label: 'Moderate' },
  { value: 'Severe', label: 'Severe' },
  { value: 'Unknown', label: 'Unknown / not documented' },
] as const;

export const CHRONIC_TREATMENT_PRESETS = [
  'Metformin and lifestyle modification; home glucose monitoring.',
  'ACE inhibitor / ARB for blood pressure control; low-sodium diet.',
  'Statin therapy; annual lipid panel; heart-healthy diet counseling.',
  'Levothyroxine daily; TSH monitoring every 6–12 months.',
  'Inhaled corticosteroid / bronchodilator per action plan; avoid triggers.',
  'Diuretic and fluid restriction; daily weights; cardiology follow-up.',
  'Anticoagulation per protocol; rate/rhythm control as indicated.',
  'PPI daily; dietary modification; GI follow-up if refractory.',
  'SSRI/SNRI per psychiatry; therapy engagement encouraged.',
  'Physical therapy; NSAIDs PRN; activity modification.',
  'Insulin regimen with carb counting; endocrinology co-management.',
] as const;

export const HOSPITALIZATION_REASON_PRESETS = [
  'Acute exacerbation of chronic condition',
  'Chest pain / rule out ACS',
  'Pneumonia / respiratory distress',
  'Syncope / altered mental status workup',
  'Diabetic ketoacidosis / hyperglycemic crisis',
  'Cellulitis / soft tissue infection',
  'GI bleed / anemia',
  'Stroke / TIA evaluation',
  'Surgical procedure — planned admission',
  'Observation after ER visit',
] as const;

export const HOSPITALIZATION_FACILITY_PRESETS = [
  'MediTap Main Hospital',
  'Lomont Medical Center',
  'Regional General Hospital',
  'University Medical Center',
  'Community Memorial Hospital',
  'Rehabilitation / skilled nursing facility',
] as const;

export const HOSPITALIZATION_PHYSICIAN_PRESETS = [
  'Dr. Evelyn Reed',
  'Dr. Michael Cho',
  'Dr. Lena Varma',
  'Dr. James Patel',
  'Hospitalist — on service',
  'Attending of record — TBD',
] as const;

export function findChronicConditionPreset(
  name: string
): ChronicConditionPreset | undefined {
  const n = name.trim().toLowerCase();
  return CHRONIC_CONDITION_PRESETS.find((c) => c.name.toLowerCase() === n);
}
