/** Tab14 intake shapes shared by document parsers (no runtime imports). */

export type Tab14PatientFields = Partial<{
  givenName: string;
  familyName: string;
  dateOfBirth: string;
  bloodType: string;
  email: string;
  phoneNumber: string;
  address: string;
  race: string;
  ethnicity: string;
  preferredLanguage: string;
  maritalStatus: string;
  sexAtBirth: string;
  heightInches: string;
  weightLbs: string;
}>;

export type Tab14InsuranceRow = {
  providerName: string;
  policyNumber: string;
  planName: string;
  memberID: string;
  groupNumber: string;
  startDate: string;
  endDate: string;
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

/** Session-only verify warnings for repeater chronic-condition fields. */
export type Tab14ChronicConditionWarnings = Partial<
  Record<number, Partial<Record<Tab14ChronicFieldKey, Tab14FieldWarning>>>
>;

export interface Tab14IntakeParseResult {
  patientFields: Tab14PatientFields;
  /** When true, caller should set allergies UI to NKDA / empty list. */
  noKnownDrugAllergies: boolean;
  insurances: Tab14InsuranceRow[];
  allergies: Tab14AllergyRow[];
  medications: Tab14MedicationRow[];
  chronicConditions: Tab14ChronicRow[];
  hospitalVisit: Tab14HospitalFields;
  /**
   * Fields that may have been misread from the document.
   * Not persisted with the patient chart — used for UI verify icons only.
   */
  fieldWarnings?: Tab14PatientFieldWarnings;
}
