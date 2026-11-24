/**
 * Localhost visual reference chart for Antonio Marquez.
 * Fills empty tab surfaces only. Never posted to the API.
 */
import type { DashboardDetail, Tab12InsuranceView } from '../api';
import type { Tab14MergeSnapshot } from '../intake/applyTab14ParseBundle';
import type { StoredParseSnapshot } from '../intake/restoreParseSnapshot';
import type {
  Tab14AllergyRow,
  Tab14ChronicRow,
  Tab14HospitalFields,
  Tab14InsuranceRow,
  Tab14LabPanel,
  Tab14MedicationRow,
  Tab14PatientFields,
  Tab14VitalReading,
} from '../intake/tab14IntakeTypes';
import {
  emptyClinicalEntry,
  emptyExtendedSections,
  TAB14_EXTENDED_SECTION_KEYS,
  type Tab14ClinicalEntry,
  type Tab14ExtendedSectionKey,
  type Tab14ExtendedSections,
} from '../intake/tab14PortabilitySections';
import { mapTab14LabPanelToApi } from '../labResults/labResultModel';
import {
  DEMO_ALLERGIES,
  DEMO_APPOINTMENTS,
  DEMO_ENCOUNTERS,
  DEMO_HEALTH,
  DEMO_LABS,
  DEMO_MEDICATIONS,
  DEMO_PROBLEMS,
  DEMO_PROFILE,
  fillIfEmpty,
  overlayDemoHealth,
  overlayDemoProfile,
} from './dashboardDemoFixtures';

export {
  DEMO_ALLERGIES,
  DEMO_APPOINTMENTS,
  DEMO_ENCOUNTERS,
  DEMO_HEALTH,
  DEMO_LABS,
  DEMO_MEDICATIONS,
  DEMO_PROBLEMS,
  DEMO_PROFILE,
  fillIfEmpty,
  overlayDemoHealth,
  overlayDemoProfile,
  shouldUseDashboardDemo,
} from './dashboardDemoFixtures';

export const ANTONIO_DISPLAY_BANNER =
  'Sample preview for Antonio Marquez on this local session only — nothing is saved to the chart.';

function isBlank(value: unknown): boolean {
  if (Array.isArray(value)) return value.length === 0;
  const t = String(value ?? '').trim();
  return !t || t === '—' || t === 'N/A' || t === 'Not recorded';
}

function isPlaceholderPatientValue(key: string, value: unknown): boolean {
  if (isBlank(value)) return true;
  const t = String(value ?? '').trim();
  if (key === 'givenName' && /^patient$/i.test(t)) return true;
  if (key === 'familyName' && /^(user|patient)$/i.test(t)) return true;
  if (key === 'patientFullName' && /^patient(\s+user)?$/i.test(t)) return true;
  if ((key === 'dateOfBirth' || key === 'sexAtBirthRecordedOn') && t.startsWith('1970-01-01')) {
    return true;
  }
  return false;
}

function entry(
  partial: Partial<Tab14ClinicalEntry> & Pick<Tab14ClinicalEntry, 'title'>
): Tab14ClinicalEntry {
  return { ...emptyClinicalEntry(), ...partial };
}

export const ANTONIO_PATIENT_FIELDS: Tab14PatientFields = {
  givenName: 'Antonio',
  familyName: 'Marquez',
  patientFullName: 'Antonio Marquez',
  dateOfBirth: DEMO_PROFILE.dateOfBirth,
  bloodType: DEMO_PROFILE.bloodType,
  email: DEMO_PROFILE.email,
  additionalEmails: [],
  phoneNumber: DEMO_PROFILE.phone,
  homePhone: '(555) 214-1100',
  communication: `${DEMO_PROFILE.phone} (Mobile)\n${DEMO_PROFILE.email}`,
  address: '1842 Willow Creek Rd, Austin, TX 78704',
  race: 'White',
  ethnicity: 'Hispanic or Latino',
  preferredLanguage: 'English',
  maritalStatus: 'Married',
  sexAtBirth: DEMO_PROFILE.sexAtBirth,
  legalSex: 'Male',
  genderIdentity: 'Man',
  sexualOrientation: 'Straight',
  sexAtBirthRecordedOn: '1988-06-14',
  otherNotes: 'Prefers morning appointments. Wear compression stockings to vascular visits.',
  heightInches: '70',
  weightLbs: '184',
  systolicBp: '128',
  diastolicBp: '82',
  heartRate: '74',
  temperatureF: '98.4',
  temperatureC: '36.9',
  respiratoryRate: '16',
  oxygenSaturation: '98',
  bodyMassIndex: DEMO_HEALTH.bmi,
  emergencyContactGivenName: 'Elena',
  emergencyContactFamilyName: 'Marquez',
  emergencyContactRelationship: 'Spouse, Emergency Contact',
  emergencyContactPhone: '(555) 214-8804',
  emergencyContactEmail: 'elena.marquez@meditap.local',
};

export const ANTONIO_VITALS_HISTORY: Tab14VitalReading[] = [
  {
    recordedDate: '2026-09-18',
    heightInches: '70',
    weightLbs: '184',
    systolicBp: '128',
    diastolicBp: '82',
    heartRate: '74',
    bodyMassIndex: '26.4',
    temperatureF: '98.4',
    respiratoryRate: '16',
    oxygenSaturation: '98',
    recordedBy: 'Dr. Elena Varga',
    organization: 'Vascular clinic',
    recordedTime: '09:42',
  },
  {
    recordedDate: '2026-06-03',
    heightInches: '70',
    weightLbs: '186',
    systolicBp: '132',
    diastolicBp: '84',
    heartRate: '76',
    bodyMassIndex: '26.7',
    temperatureF: '98.6',
    respiratoryRate: '16',
    oxygenSaturation: '97',
    recordedBy: 'Dr. Priya Nair',
    organization: 'Main campus',
    recordedTime: '14:10',
  },
];

const ANTONIO_ALLERGIES: Tab14AllergyRow[] = DEMO_ALLERGIES.map((row) => ({
  allergyName: row.name,
  allergyType: row.typeLabel,
  allergyTypeOther: '',
  severity: row.severity,
  reactionNotes: row.reaction,
  lastObserved: row.lastObserved,
  recordedBy: 'Dr. Priya Nair',
  organization: 'Main campus',
}));

const ANTONIO_MEDICATIONS: Tab14MedicationRow[] = DEMO_MEDICATIONS.map((row) => ({
  genericName: row.genericName,
  brandName: row.brandName,
  dosage: row.dosage,
  route: 'Oral',
  frequency: row.frequency,
  startDate: row.startDate,
  endDate: '',
  purpose: row.purpose,
  prescribingPhysician: row.prescriber,
  notesMedication: 'Sample medication — not saved.',
  status: 'Active',
  organization: 'Main campus',
}));

const ANTONIO_PROBLEMS: Tab14ChronicRow[] = DEMO_PROBLEMS.map((row) => ({
  conditionName: row.name,
  icdCode: row.icdCode,
  diagnosisDate: row.diagnosisDate,
  severity: row.severity,
  prexisting: row.preExisting ? 'Yes' : 'No',
  notesChronicConditions: row.currentTreatment,
  status: 'Active',
}));

const ANTONIO_PAYERS: Tab14InsuranceRow[] = [
  {
    providerName: 'Blue Cross Blue Shield of Texas',
    policyNumber: 'POL-AM-55210',
    planName: 'PPO Select Gold',
    memberID: 'MEM-AM-1042',
    groupNumber: 'GRP-4400',
    startDate: '2025-01-01',
    endDate: '2026-12-31',
    payerId: 'BCBSTX-001',
    guarantor: 'Antonio Marquez',
    memberName: 'Antonio Marquez',
    relationToSubscriber: 'Self',
    subscriberName: 'Antonio Marquez',
    subscriberId: 'SUB-AM-1042',
    subscriberDob: DEMO_PROFILE.dateOfBirth,
    billingAddress: '1842 Willow Creek Rd, Austin, TX 78704',
  },
];

const ANTONIO_ENCOUNTERS: Tab14HospitalFields[] = DEMO_ENCOUNTERS.map((row, i) => ({
  facilityName: row.location,
  visitType: row.type,
  reason: row.details,
  visitDate: row.date,
  dischargeDate: row.date,
  attendingPhysician: i === 0 ? 'Dr. Elena Varga' : 'Dr. Priya Nair',
  reportId: row.id,
  encounterId: `ENC-${row.id}`,
  location: row.location,
  diagnosisNote: row.outcome,
}));

export const ANTONIO_TAB14_LABS: Tab14LabPanel[] = DEMO_LABS.map((row) => ({
  testName: row.testName,
  date: row.date,
  status: row.status,
  isNew: row.isNew,
  category: row.category || 'lab',
  displayCode: row.id,
  notes: row.notes,
  components: row.results.map((c) => ({
    name: c.name,
    value: typeof c.value === 'number' ? c.value : undefined,
    textValue: typeof c.value === 'number' ? undefined : String(c.value ?? ''),
    unit: c.unit,
    range: c.range,
    critical: c.critical,
    interpretation: c.interpretation,
  })),
}));

const EXTENDED_SAMPLES: Record<Tab14ExtendedSectionKey, Tab14ClinicalEntry[]> = {
  relatedPerson: [
    entry({
      title: 'Elena Marquez',
      detail: 'Spouse and emergency contact; lives in the same household.',
      date: '2026-06-03',
      relationship: 'Spouse',
      phone: '(555) 214-8804',
      email: 'elena.marquez@meditap.local',
      address: '1842 Willow Creek Rd, Austin, TX 78704',
      recordedBy: 'Dr. Priya Nair',
      place: 'Main campus',
    }),
  ],
  careTeamMembers: [
    entry({
      title: 'Dr. Priya Nair',
      detail: 'Primary care physician coordinating diabetes and blood-pressure follow-up.',
      date: '2026-06-03',
      role: 'PCP',
      specialty: 'Family medicine',
      phone: '(555) 200-1140',
      recordedBy: 'Clinic registrar',
      place: 'Main campus',
    }),
    entry({
      title: 'Dr. Elena Varga',
      detail: 'Vascular specialist for chronic venous insufficiency.',
      date: '2026-09-18',
      role: 'Specialist',
      specialty: 'Angiology',
      phone: '(555) 200-2208',
      recordedBy: 'Clinic registrar',
      place: 'Vascular clinic',
    }),
  ],
  careTeam: [
    entry({
      title: 'Dr. Priya Nair',
      detail: 'NPI table row for primary care.',
      date: '2026-06-03',
      role: 'Primary Care',
      npi: '1487654321',
      memberId: 'CT-1042-01',
      specialty: 'Family medicine',
      place: 'Main campus',
    }),
  ],
  assessment: [
    entry({
      title: 'Vascular follow-up assessment',
      detail: 'Bilateral lower-extremity edema improved with compression. Blood pressure at goal on losartan.',
      date: '2026-09-18',
      recordedBy: 'Dr. Elena Varga',
      place: 'Vascular clinic',
      status: 'Active',
    }),
  ],
  planOfTreatment: [
    entry({
      title: 'Continue compression and A1c monitoring',
      detail: 'Compression 20–30 mmHg daily. Repeat A1c in 3 months. Vascular follow-up Nov 4.',
      date: '2026-09-18',
      category: 'Follow-up',
      recordedBy: 'Dr. Elena Varga',
      place: 'Vascular clinic',
    }),
  ],
  patientInstructions: [
    entry({
      title: 'Home compression instructions',
      detail: 'Wear stockings during the day. Elevate legs in the evening. Call for sudden calf pain or swelling.',
      date: '2026-09-18',
      recordedBy: 'Dr. Elena Varga',
      place: 'Vascular clinic',
    }),
  ],
  results: [
    entry({
      title: 'Hemoglobin A1c',
      detail: 'A1c 7.2 % [target <7.0] — trending down on metformin.',
      date: '2026-09-12',
      status: 'Final',
      category: 'lab',
      code: 'A1C',
      recordedBy: 'Quest Diagnostics',
      place: 'Outpatient lab',
    }),
  ],
  reasonForReferral: [
    entry({
      title: 'Referral to vascular surgery',
      detail: 'Chronic venous insufficiency with persistent edema despite conservative care.',
      date: '2026-03-12',
      recordedBy: 'Dr. Priya Nair',
      place: 'Main campus',
    }),
  ],
  procedures: [
    entry({
      title: 'Venous duplex ultrasound',
      detail: 'Bilateral lower-extremity venous duplex; no DVT.',
      date: '2026-09-18',
      category: 'Imaging',
      laterality: 'Bilateral',
      performer: 'Dr. Elena Varga',
      place: 'Vascular clinic',
    }),
  ],
  surgicalHistory: [
    entry({
      title: 'Appendectomy',
      detail: 'Uncomplicated laparoscopic appendectomy in adolescence.',
      date: '2004-07-21',
      recordedBy: 'Dr. Priya Nair',
      place: 'Main campus',
    }),
  ],
  imagingResults: [
    entry({
      title: 'Venous duplex ultrasound, lower extremities',
      detail: 'Chronic venous insufficiency; no deep-vein thrombosis.',
      date: '2026-09-18',
      status: 'Final',
      category: 'Ultrasound',
      laterality: 'Bilateral',
      performer: 'Dr. Elena Varga',
      place: 'Vascular clinic',
    }),
  ],
  procedureNotes: [
    entry({
      title: 'Ultrasound procedure note',
      detail: 'Technically adequate study. Patient tolerated the exam without complication.',
      date: '2026-09-18',
      recordedBy: 'Dr. Elena Varga',
      place: 'Vascular clinic',
    }),
  ],
  medicalEquipment: [
    entry({
      title: 'Graduated compression stockings',
      detail: '20–30 mmHg knee-high stockings, replaced annually.',
      date: '2026-03-12',
      status: 'Active',
      recordedBy: 'Dr. Elena Varga',
      place: 'Vascular clinic',
    }),
  ],
  socialHistory: [
    entry({
      title: 'Tobacco and alcohol',
      detail: 'Never smoker. Occasional alcohol. Desk work with long sitting periods.',
      date: '2026-06-03',
      recordedBy: 'Dr. Priya Nair',
      place: 'Main campus',
    }),
  ],
  functionalStatus: [
    entry({
      title: 'Independent ADLs',
      detail: 'Independent in activities of daily living. Walks 20 minutes most days.',
      date: '2026-06-03',
      recordedBy: 'Dr. Priya Nair',
      place: 'Main campus',
    }),
  ],
  mentalStatus: [
    entry({
      title: 'PHQ-2',
      detail: 'Negative screen. No depressive symptoms reported.',
      date: '2026-06-03',
      score: '0',
      recordedBy: 'Dr. Priya Nair',
      place: 'Main campus',
    }),
  ],
  familyHistory: [
    entry({
      title: 'Father — hypertension',
      detail: 'Father diagnosed with essential hypertension in his 50s.',
      date: '2026-06-03',
      relationship: 'Father',
      onsetAge: '52',
      recordedBy: 'Dr. Priya Nair',
      place: 'Main campus',
    }),
  ],
  medicalHistory: [
    entry({
      title: 'Type 2 diabetes risk / prediabetes',
      detail: 'A1c 6.4% in September 2026. Diet and activity counseling in place.',
      date: '2026-09-12',
      response: 'Y',
      recordedBy: 'Dr. Priya Nair',
      place: 'Main campus',
    }),
  ],
  obstetricsHistory: [
    entry({
      title: 'Not applicable',
      detail: 'No obstetric history for this patient.',
      date: '2026-06-03',
      notes: 'Male patient — section shown for display reference only.',
      recordedBy: 'Dr. Priya Nair',
      place: 'Main campus',
    }),
  ],
  immunizations: [
    entry({
      title: 'Influenza vaccine',
      detail: 'Seasonal influenza vaccine, left deltoid.',
      date: '2025-10-14',
      status: 'Completed',
      recordedBy: 'Clinic nurse',
      place: 'Main campus',
    }),
    entry({
      title: 'COVID-19 booster',
      detail: 'Updated COVID-19 booster.',
      date: '2025-11-02',
      status: 'Completed',
      recordedBy: 'Clinic nurse',
      place: 'Main campus',
    }),
  ],
  goals: [
    entry({
      title: 'Blood-pressure goal',
      detail: 'Maintain home readings under 130/80 with daily losartan.',
      date: '2026-06-03',
      status: 'Active',
      recordedBy: 'Dr. Priya Nair',
      place: 'Main campus',
    }),
  ],
  healthConcerns: [
    entry({
      title: 'Leg swelling with prolonged standing',
      detail: 'Patient reports evening edema after long workdays.',
      date: '2026-03-12',
      status: 'Active',
      recordedBy: 'Dr. Elena Varga',
      place: 'Vascular clinic',
    }),
  ],
  advanceDirectives: [
    entry({
      title: 'No advance directive on file',
      detail: 'Patient declined completing a directive at the last annual visit.',
      date: '2026-06-03',
      status: 'Not on file',
      recordedBy: 'Dr. Priya Nair',
      place: 'Main campus',
    }),
  ],
  notes: [
    entry({
      title: 'Chart display sample',
      detail: 'Local preview note so Notes has a filled card. Not part of the saved chart.',
      date: '2026-09-18',
      noteType: 'text/plain',
      recordedBy: 'MediTap display preview',
      place: 'Local session',
    }),
  ],
};

export const ANTONIO_EXTENDED_SECTIONS: Tab14ExtendedSections = (() => {
  const out = emptyExtendedSections();
  for (const key of TAB14_EXTENDED_SECTION_KEYS) {
    out[key] = EXTENDED_SAMPLES[key] ?? [];
  }
  return out;
})();

export const ANTONIO_TAB14_MERGE: Tab14MergeSnapshot = {
  allergies: ANTONIO_ALLERGIES,
  noAllergies: false,
  insurances: ANTONIO_PAYERS,
  medications: ANTONIO_MEDICATIONS,
  noMedications: false,
  chronicConditions: ANTONIO_PROBLEMS,
  noChronicConditions: false,
  hospitalVisits: ANTONIO_ENCOUNTERS,
  labPanels: ANTONIO_TAB14_LABS,
};

export const ANTONIO_TAB14_SNAPSHOT: StoredParseSnapshot = {
  patientFields: ANTONIO_PATIENT_FIELDS,
  allergies: ANTONIO_ALLERGIES,
  medications: ANTONIO_MEDICATIONS,
  chronicConditions: ANTONIO_PROBLEMS,
  insurances: ANTONIO_PAYERS,
  hospitalVisits: ANTONIO_ENCOUNTERS,
  labPanels: ANTONIO_TAB14_LABS,
  extendedSections: ANTONIO_EXTENDED_SECTIONS,
  vitalsHistory: ANTONIO_VITALS_HISTORY,
  noKnownDrugAllergies: false,
  noKnownProblems: false,
  source: 'antonio-local-display',
};

export const ANTONIO_INSURANCE_VIEW: Tab12InsuranceView = {
  patientName: DEMO_PROFILE.fullName,
  dateOfBirth: DEMO_PROFILE.dateOfBirth,
  rows: [
    {
      meta: {
        patientInsuranceId: 0,
        policyUuid: 'demo-antonio-policy',
        providerUuid: 'demo-antonio-provider',
      },
      policy: {
        memberId: 'MEM-AM-1042',
        policyId: 'POL-AM-55210',
        planType: 'PPO Select Gold',
        providerName: 'Blue Cross Blue Shield of Texas',
        providerPhone: '(800) 521-2222',
        providerEmail: 'members@bcbstx.example',
        policyHolderName: 'Antonio Marquez',
        coverageType: 'Self',
        groupNumber: 'GRP-4400',
        startDate: '2025-01-01',
        endDate: '2026-12-31',
        copayVPCP: '$25',
        copaySC: '$45',
        copayEUC: '$150 / $75',
        prescriptionDPI: 'Tiered Rx, $10 / $35 / $70',
        healthPWA: 'https://members.bcbstx.example',
        inNetworkDAC: '80% after deductible',
        outofNetworkDAC: '60% after deductible',
        planContactInfo: 'Member services 24/7',
        deductible: '$1,500 individual',
        maxOutOfPocket: '$6,000 individual',
        status: 'Active',
      },
    },
  ],
};

export function overlayBlankPatientFields<T extends object>(
  base: T,
  demo: Tab14PatientFields
): T {
  const next: Record<string, unknown> = { ...(base as Record<string, unknown>) };
  let changed = false;
  for (const [key, value] of Object.entries(demo)) {
    const current = next[key];
    if (Array.isArray(value)) {
      if (isPlaceholderPatientValue(key, current) && value.length > 0) {
        next[key] = value;
        changed = true;
      }
      continue;
    }
    if (typeof value === 'string' && isPlaceholderPatientValue(key, current)) {
      next[key] = value;
      changed = true;
    }
  }
  return changed ? (next as T) : base;
}

export function overlayDemoDashboardDetail(
  detail: DashboardDetail | null
): DashboardDetail {
  const healthBase = detail?.healthSummary ?? {
    bmi: '',
    bmiCategory: '',
    heightDisplay: '',
    weightDisplay: '',
    bloodPressure: '',
    heartRate: '',
    lmd: '',
    lastVisit: '',
    allergies: 0,
    medications: 0,
  };
  const allergies = fillIfEmpty(detail?.allergies ?? [], DEMO_ALLERGIES);
  const medications = fillIfEmpty(detail?.medications ?? [], DEMO_MEDICATIONS);
  const chronic = fillIfEmpty(
    detail?.chronicConditions ?? [],
    DEMO_PROBLEMS.map((row) => ({
      conditionName: row.name,
      icdCode: row.icdCode,
      diagnosisDate: row.diagnosisDate,
      severity: row.severity,
      preexisting: row.preExisting ? 'Yes' : 'No',
      notes: row.currentTreatment,
    }))
  );
  return {
    name: detail?.name || DEMO_PROFILE.fullName,
    id: detail?.id || DEMO_PROFILE.patientId,
    email: detail?.email || DEMO_PROFILE.email,
    healthSummary: {
      ...overlayDemoHealth(healthBase),
      allergies: allergies.length,
      medications: medications.length,
    },
    patientProfile: overlayDemoProfile(detail?.patientProfile),
    allergies,
    medications,
    chronicConditions: chronic,
    insurance: fillIfEmpty(detail?.insurance ?? [], [
      {
        provider: ANTONIO_PAYERS[0].providerName,
        planName: ANTONIO_PAYERS[0].planName,
        policyId: ANTONIO_PAYERS[0].policyNumber,
        groupNumber: ANTONIO_PAYERS[0].groupNumber,
        memberId: ANTONIO_PAYERS[0].memberID,
        status: 'Active',
        validUntil: ANTONIO_PAYERS[0].endDate,
      },
    ]),
    hospital:
      detail?.hospital ??
      {
        type: ANTONIO_ENCOUNTERS[0].visitType || 'Visit',
        facility: ANTONIO_ENCOUNTERS[0].facilityName || 'Vascular clinic',
        reason: ANTONIO_ENCOUNTERS[0].reason || '',
        date: ANTONIO_ENCOUNTERS[0].visitDate || '',
        discharge: ANTONIO_ENCOUNTERS[0].dischargeDate || '',
        attending: ANTONIO_ENCOUNTERS[0].attendingPhysician || '',
        reportId: ANTONIO_ENCOUNTERS[0].reportId || '',
      },
  };
}

export function antonioDemoLabPanels(patientId = 'demo-antonio') {
  return ANTONIO_TAB14_LABS.map((panel, i) => mapTab14LabPanelToApi(panel, i, patientId));
}

export function overlayInsuranceView(
  view: Tab12InsuranceView | null
): Tab12InsuranceView | null {
  if (!view) return ANTONIO_INSURANCE_VIEW;
  const placeholderName =
    isBlank(view.patientName) ||
    /^patient(\s+user)?$/i.test(view.patientName.trim());
  const placeholderDob =
    isBlank(view.dateOfBirth) || view.dateOfBirth.startsWith('1970-01-01');
  if (view.rows.length > 0) {
    return {
      ...view,
      patientName: placeholderName ? ANTONIO_INSURANCE_VIEW.patientName : view.patientName,
      dateOfBirth: placeholderDob ? ANTONIO_INSURANCE_VIEW.dateOfBirth : view.dateOfBirth,
    };
  }
  return {
    ...ANTONIO_INSURANCE_VIEW,
    patientName: placeholderName ? ANTONIO_INSURANCE_VIEW.patientName : view.patientName,
    dateOfBirth: placeholderDob ? ANTONIO_INSURANCE_VIEW.dateOfBirth : view.dateOfBirth,
  };
}
