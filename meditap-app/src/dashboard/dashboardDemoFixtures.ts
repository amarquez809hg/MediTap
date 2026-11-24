import type { DashboardDetail, Tab5ChronicCondition } from '../api';
import type { Appointment } from '../appointments/appointmentStorage';
import type { IncidentRecord } from '../incidents/incidentModel';
import type { LabResultRow } from '../labResults/labResultModel';

/** Localhost visual fill only — never posted to the API. */
export function shouldUseDashboardDemo(): boolean {
  if (typeof window !== 'undefined') {
    const flag = new URLSearchParams(window.location.search).get('demo');
    if (flag === '0' || flag === 'false') return false;
    if (flag === '1' || flag === 'true') return true;
  }
  return Boolean(import.meta.env.DEV);
}

export function fillIfEmpty<T>(real: T[], demo: T[]): T[] {
  return real.length > 0 ? real : demo;
}

export const DEMO_PROFILE: DashboardDetail['patientProfile'] = {
  fullName: 'Antonio Marquez',
  patientId: 'MT-DEMO-1042',
  dateOfBirth: '1988-06-14',
  bloodType: 'O+',
  sexAtBirth: 'Male',
  email: 'antonio@meditap.local',
  phone: '(555) 214-8803',
};

export const DEMO_HEALTH = {
  bmi: '26.4',
  bmiCategory: 'Overweight',
  heightDisplay: '5 ft 10 in',
  weightDisplay: '184 lb',
  bloodPressure: '128/82',
  heartRate: '74 bpm',
  lmd: '—',
  lastVisit: 'Sep 18, 2026',
  allergies: 2,
  medications: 2,
};

export const DEMO_APPOINTMENTS: Appointment[] = [
  {
    id: 'demo-appt-1',
    date: 'Tuesday, Nov 4',
    time: '09:30 AM',
    specialist: 'Dr. Elena Varga',
    department: 'Angiology and Vascular Surgery',
    type: 'Follow-up',
    status: 'Confirmed',
    reasonForVisit: 'Chronic venous insufficiency review and compression check.',
    location: 'Clinic 2, Vascular suite',
    duration: '30 min',
    appointmentId: 'APPT-DEMO-01',
    patientInstructions: 'Wear compression stockings to the visit.',
    clinicalNotes: 'Sample appointment — not saved.',
  },
  {
    id: 'demo-appt-2',
    date: 'Monday, Dec 1',
    time: '02:00 PM',
    specialist: 'Dr. Priya Nair',
    department: 'Primary Care',
    type: 'In-office',
    status: 'Scheduled',
    reasonForVisit: 'Annual labs and medication refill.',
    location: 'Main campus, Room 114',
    duration: '20 min',
    appointmentId: 'APPT-DEMO-02',
    patientInstructions: 'Fasting not required.',
    clinicalNotes: 'Sample appointment — not saved.',
  },
];

export const DEMO_ALLERGIES: DashboardDetail['allergies'] = [
  {
    name: 'Penicillin',
    typeLabel: 'Drug',
    reaction: 'Urticaria, throat tightness',
    severity: 'High',
    lastObserved: '2021-04-02',
  },
  {
    name: 'Peanuts',
    typeLabel: 'Food',
    reaction: 'Oral itching',
    severity: 'Moderate',
    lastObserved: '2019-11-11',
  },
];

export const DEMO_MEDICATIONS: DashboardDetail['medications'] = [
  {
    genericName: 'Metformin',
    brandName: 'Glucophage',
    dosage: '500 mg',
    frequency: 'Twice daily',
    purpose: 'Type 2 diabetes',
    prescriber: 'Dr. Priya Nair',
    startDate: '2022-01-15',
  },
  {
    genericName: 'Losartan',
    brandName: 'Cozaar',
    dosage: '50 mg',
    frequency: 'Once daily',
    purpose: 'Blood pressure',
    prescriber: 'Dr. Elena Varga',
    startDate: '2023-08-01',
  },
];

export const DEMO_PROBLEMS: Tab5ChronicCondition[] = [
  {
    apiId: null,
    diseaseId: 'demo-htn',
    name: 'Essential hypertension',
    icdCode: 'I10',
    diagnosisDate: '2023-08-01',
    severity: 'Moderate',
    preExisting: true,
    currentTreatment: 'Losartan 50 mg daily',
    hospitalizations: [],
  },
  {
    apiId: null,
    diseaseId: 'demo-cvi',
    name: 'Chronic venous insufficiency',
    icdCode: 'I87.2',
    diagnosisDate: '2024-03-12',
    severity: 'Mild',
    preExisting: false,
    currentTreatment: 'Compression 20–30 mmHg',
    hospitalizations: [],
  },
];

export const DEMO_LABS: LabResultRow[] = [
  {
    id: 'DEMO-CBC',
    testName: 'Complete blood count',
    date: '2026-09-12',
    status: 'Final',
    isNew: false,
    category: 'lab',
    results: [
      { name: 'Hemoglobin', value: 14.2, unit: 'g/dL', range: '13.5–17.5', critical: false },
      { name: 'WBC', value: 6.8, unit: 'K/uL', range: '4.5–11.0', critical: false },
    ],
  },
  {
    id: 'DEMO-A1C',
    testName: 'Hemoglobin A1c',
    date: '2026-09-12',
    status: 'Final',
    isNew: true,
    category: 'lab',
    results: [
      { name: 'HbA1c', value: 6.4, unit: '%', range: '<5.7', critical: false, interpretation: 'Prediabetes range' },
    ],
  },
  {
    id: 'DEMO-LIPID',
    testName: 'Lipid panel',
    date: '2026-09-12',
    status: 'Final',
    isNew: false,
    category: 'lab',
    results: [
      { name: 'LDL', value: 118, unit: 'mg/dL', range: '<100', critical: false, interpretation: 'Above goal' },
      { name: 'HDL', value: 46, unit: 'mg/dL', range: '>40', critical: false },
      { name: 'Triglycerides', value: 162, unit: 'mg/dL', range: '<150', critical: false },
    ],
  },
  {
    id: 'DEMO-US',
    testName: 'Venous duplex ultrasound, lower extremities',
    date: '2026-09-18',
    status: 'Final',
    isNew: false,
    category: 'imaging',
    results: [
      { name: 'Impression', value: 0, unit: '', range: '', critical: false, interpretation: 'Chronic venous insufficiency; no DVT' },
    ],
  },
];

export const DEMO_ENCOUNTERS: IncidentRecord[] = [
  {
    id: 'DEMO-E-01',
    type: 'Outpatient consult',
    date: '2026-09-18',
    severity: '—',
    location: 'Vascular clinic',
    outcome: 'Follow-up scheduled',
    details: 'Lower-extremity edema review; compression counseling.',
  },
  {
    id: 'DEMO-E-02',
    type: 'Primary care visit',
    date: '2026-06-03',
    severity: '—',
    location: 'Main campus',
    outcome: 'Labs ordered',
    details: 'Medication refill and A1c check.',
  },
];

function isBlank(v: string | undefined): boolean {
  const t = (v || '').trim();
  return !t || t === '—' || t === 'N/A' || t === 'Not recorded';
}

export function overlayDemoProfile(
  profile: DashboardDetail['patientProfile'] | undefined
): DashboardDetail['patientProfile'] {
  const base = profile || {
    fullName: '',
    patientId: '',
    dateOfBirth: '',
    bloodType: '',
    sexAtBirth: '',
    email: '',
    phone: '',
  };
  return {
    ...base,
    dateOfBirth:
      isBlank(base.dateOfBirth) || base.dateOfBirth.startsWith('1970-01-01')
        ? DEMO_PROFILE.dateOfBirth
        : base.dateOfBirth,
    bloodType: isBlank(base.bloodType) ? DEMO_PROFILE.bloodType : base.bloodType,
    sexAtBirth: isBlank(base.sexAtBirth) ? DEMO_PROFILE.sexAtBirth : base.sexAtBirth,
    phone: isBlank(base.phone) ? DEMO_PROFILE.phone : base.phone,
    email: isBlank(base.email) ? DEMO_PROFILE.email : base.email,
  };
}

export function overlayDemoHealth<T extends Record<string, string | number>>(health: T): T {
  const next: Record<string, string | number> = { ...health };
  if (isBlank(String(next.bmi ?? '')) || String(next.bmi) === 'N/A') {
    next.bmi = DEMO_HEALTH.bmi;
  }
  if (isBlank(String(next.bmiCategory ?? '')) || String(next.bmiCategory) === 'Not recorded') {
    next.bmiCategory = DEMO_HEALTH.bmiCategory;
  }
  if (isBlank(String(next.bloodPressure ?? ''))) {
    next.bloodPressure = DEMO_HEALTH.bloodPressure;
  }
  if (isBlank(String(next.heartRate ?? ''))) {
    next.heartRate = DEMO_HEALTH.heartRate;
  }
  if (isBlank(String(next.lastVisit ?? ''))) {
    next.lastVisit = DEMO_HEALTH.lastVisit;
  }
  if (isBlank(String(next.heightDisplay ?? ''))) {
    next.heightDisplay = DEMO_HEALTH.heightDisplay;
  }
  if (isBlank(String(next.weightDisplay ?? ''))) {
    next.weightDisplay = DEMO_HEALTH.weightDisplay;
  }
  return next as T;
}
