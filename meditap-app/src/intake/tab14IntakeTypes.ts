/** Tab14 intake shapes shared by document parsers (no runtime imports). */

export type Tab14PatientFields = Partial<{
  givenName: string;
  familyName: string;
  dateOfBirth: string;
  bloodType: string;
  email: string;
  /** Extra emails beyond the primary `email` field. */
  additionalEmails: string[];
  phoneNumber: string;
  address: string;
  race: string;
  ethnicity: string;
  preferredLanguage: string;
  maritalStatus: string;
  sexAtBirth: string;
  legalSex: string;
  genderIdentity: string;
  sexualOrientation: string;
  sexAtBirthRecordedOn: string;
  otherNotes: string;
  heightInches: string;
  weightLbs: string;
  systolicBp: string;
  diastolicBp: string;
  heartRate: string;
  temperatureF: string;
  temperatureC: string;
  respiratoryRate: string;
  oxygenSaturation: string;
  bodyMassIndex: string;
  emergencyContactGivenName: string;
  emergencyContactFamilyName: string;
  emergencyContactRelationship: string;
  emergencyContactPhone: string;
  emergencyContactEmail: string;
}>;

export type Tab14InsuranceRow = {
  providerName: string;
  policyNumber: string;
  planName: string;
  memberID: string;
  groupNumber: string;
  startDate: string;
  endDate: string;
  payerId: string;
  guarantor: string;
  memberName: string;
  relationToSubscriber: string;
  subscriberName: string;
  subscriberId: string;
  subscriberDob: string;
  billingAddress: string;
};

export type Tab14AllergyRow = {
  allergyName: string;
  allergyType: string;
  allergyTypeOther: string;
  severity: string;
  reactionNotes: string;
  lastObserved: string;
};

export type Tab14MedicationRow = {
  genericName: string;
  brandName: string;
  dosage: string;
  route: string;
  frequency: string;
  startDate: string;
  endDate: string;
  purpose: string;
  prescribingPhysician: string;
  notesMedication: string;
};

export type Tab14ChronicRow = {
  conditionName: string;
  icdCode: string;
  diagnosisDate: string;
  severity: string;
  prexisting: string;
  notesChronicConditions: string;
};

export type Tab14HospitalFields = Partial<{
  facilityName: string;
  visitType: string;
  reason: string;
  visitDate: string;
  dischargeDate: string;
  attendingPhysician: string;
  reportId: string;
}>;

/** Lab / imaging / related result panel imported from PDF (maps to PatientLabPanel). */
export type Tab14LabComponent = {
  name: string;
  /** Numeric value when available. */
  value?: number;
  /** Qualitative / comparator value e.g. "<0.6". */
  textValue?: string;
  unit: string;
  range: string;
  critical: boolean;
  interpretation?: string;
};

export type Tab14LabPanelCategory =
  | 'lab'
  | 'imaging'
  | 'vitals'
  | 'clinical'
  | 'social'
  | 'contact';

export type Tab14LabPanel = {
  testName: string;
  date: string;
  status: string;
  isNew: boolean;
  category: Tab14LabPanelCategory;
  displayCode?: string;
  notes?: string;
  clinicalIndication?: string;
  impression?: string;
  accessionNumber?: string;
  modality?: string;
  signedBy?: string;
  components: Tab14LabComponent[];
};

/** Patient demographic keys that may carry PDF/OCR verification warnings. */
export type Tab14PatientFieldKey = keyof Tab14PatientFields;

export type Tab14FieldWarningReason =
  | 'label_bleed'
  | 'contains_other_label'
  | 'suspicious_name'
  | 'ocr_sparse'
  | 'other';

export type Tab14FieldWarning = {
  /** Staff-facing copy: needs verification, not "wrong". */
  message: string;
  reason: Tab14FieldWarningReason;
};

/** Optional per-field warnings from PDF/OCR extraction (session UI only). */
export type Tab14PatientFieldWarnings = Partial<
  Record<Tab14PatientFieldKey, Tab14FieldWarning>
>;

export type Tab14ChronicFieldKey = keyof Tab14ChronicRow;
export type Tab14InsuranceFieldKey = keyof Tab14InsuranceRow;
export type Tab14AllergyFieldKey = keyof Tab14AllergyRow;
export type Tab14MedicationFieldKey = keyof Tab14MedicationRow;
export type Tab14HospitalFieldKey = keyof Tab14HospitalFields;

/** Session-only verify warnings for indexed repeater rows. */
export type Tab14IndexedRowWarnings<K extends string> = Partial<
  Record<number, Partial<Record<K, Tab14FieldWarning>>>
>;

/** Session-only verify warnings for repeater chronic-condition fields. */
export type Tab14ChronicConditionWarnings = Tab14IndexedRowWarnings<Tab14ChronicFieldKey>;
export type Tab14InsuranceRowWarnings = Tab14IndexedRowWarnings<Tab14InsuranceFieldKey>;
export type Tab14AllergyRowWarnings = Tab14IndexedRowWarnings<Tab14AllergyFieldKey>;
export type Tab14MedicationRowWarnings = Tab14IndexedRowWarnings<Tab14MedicationFieldKey>;
export type Tab14HospitalFieldWarnings = Partial<Record<Tab14HospitalFieldKey, Tab14FieldWarning>>;

export interface Tab14IntakeParseResult {
  patientFields: Tab14PatientFields;
  /** When true, caller should set allergies UI to NKDA / empty list. */
  noKnownDrugAllergies: boolean;
  insurances: Tab14InsuranceRow[];
  allergies: Tab14AllergyRow[];
  medications: Tab14MedicationRow[];
  chronicConditions: Tab14ChronicRow[];
  hospitalVisit: Tab14HospitalFields;
  /** Lab / imaging / related panels from the document. */
  labPanels: Tab14LabPanel[];
  /**
   * Fields that may have been misread from the document.
   * Not persisted with the patient chart — used for UI verify icons only.
   */
  fieldWarnings?: Tab14PatientFieldWarnings;
}

export function emptyInsuranceRow(): Tab14InsuranceRow {
  return {
    providerName: '',
    policyNumber: '',
    planName: '',
    memberID: '',
    groupNumber: '',
    startDate: '',
    endDate: '',
    payerId: '',
    guarantor: '',
    memberName: '',
    relationToSubscriber: '',
    subscriberName: '',
    subscriberId: '',
    subscriberDob: '',
    billingAddress: '',
  };
}
