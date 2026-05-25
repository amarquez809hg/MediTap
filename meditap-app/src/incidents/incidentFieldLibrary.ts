/** Staff quick-pick library for Incident Records (Tab6). */

export const INCIDENT_SEVERITY_OPTIONS = [
  'Low',
  'Medium',
  'High',
  'Critical',
] as const;

export const INCIDENT_RECORD_ID_PRESETS = [
  'Auto-generate on save',
  'I-URGENT-001',
  'I-FALL-001',
  'I-MED-001',
  'I-ER-001',
] as const;

export const INCIDENT_TYPE_OPTIONS = [
  'Fall — same level',
  'Fall — from height',
  'Motor vehicle collision',
  'Work-related injury',
  'Sports / recreational injury',
  'Burn',
  'Laceration / wound',
  'Allergic reaction',
  'Medication error',
  'Adverse drug reaction',
  'Syncope / near-syncope',
  'Chest pain — evaluated',
  'Shortness of breath — acute',
  'Altered mental status',
  'Seizure',
  'Assault / trauma',
  'Other — specify in summary',
] as const;

export const INCIDENT_LOCATION_OPTIONS = [
  'Home — residence',
  'Workplace',
  'School / campus',
  'Public street / sidewalk',
  'Retail / commercial site',
  'Sports facility / gym',
  'Long-term care / nursing home',
  'Ambulatory clinic',
  'Emergency department',
  'Inpatient hospital unit',
  'Vehicle — driver/passenger',
  'Unknown / not documented',
] as const;

export const INCIDENT_OUTCOME_PRESETS = [
  'Treated on scene; no ER visit required.',
  'Urgent care visit; discharged same day.',
  'ED evaluation; discharged home with instructions.',
  'Admitted for observation; discharged within 24 hours.',
  'Admitted; inpatient treatment completed.',
  'Referred to specialist; outpatient follow-up scheduled.',
  'Imaging obtained; no acute fracture identified.',
  'Wound care and antibiotics prescribed.',
  'Patient declined further care; left AMA documented.',
  'Report filed; monitoring only at this time.',
] as const;

export const INCIDENT_DETAILS_PRESETS = [
  'Patient reports sudden onset of symptoms. Vital signs stable on assessment. Incident documented for chart completeness.',
  'Mechanism of injury described by patient. No loss of consciousness reported. Pain localized; neurovascular exam intact.',
  'Witnessed event per patient account. EMS not called. Family present at time of visit.',
  'Injury occurred during routine activity. Swelling and tenderness noted. X-ray/imaging pending or reviewed.',
  'Medication list reconciled after event. Allergy status confirmed. Return precautions discussed.',
  'Employer incident report referenced. OSHA/work comp paperwork may apply.',
  'Fall risk assessment updated. Home safety education provided.',
] as const;

export function suggestIncidentRecordCode(nextIndex: number): string {
  return `I-${String(nextIndex).padStart(4, '0')}`;
}
