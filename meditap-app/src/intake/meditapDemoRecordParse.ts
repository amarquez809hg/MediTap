/**
 * Parser for MediTap demo / intake PDFs with explicit "Label: value" sections
 * (e.g. Riley Moore Demo Record For Meditap-3.pdf).
 */

import { tryParseDateToIso } from './intakeDateParse';
import type {
  Tab14AllergyRow,
  Tab14ChronicRow,
  Tab14HospitalFields,
  Tab14InsuranceRow,
  Tab14IntakeParseResult,
  Tab14MedicationRow,
  Tab14PatientFields,
} from './tab14IntakeTypes';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

function collapseWs(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function cleanValue(v: string): string {
  return collapseWs(v.replace(/\*+$/g, '').replace(/\s+\d+$/g, '').trim());
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** PDF text layers often glue "Given Name: Riley Family Name: Moore" on one line. */
export function preprocessGluedLabelText(text: string): string {
  const breaks = [
    'Family Name:',
    'Date of Birth:',
    'Sex at Birth:',
    'Blood Type:',
    'Email:',
    'Phone Number:',
    'Address:',
    'Race:',
    'Ethnicity:',
    'Preferred Language:',
    'Marital Status:',
    'Allergen:',
    'Reaction:',
    'Severity:',
    'Status:',
    'Provider Name:',
    'Policy Number:',
    'Plan Name:',
    'Member ID:',
    'Group Number:',
    'Start Date:',
    'End Date:',
    'Facility:',
    'Reason:',
    'Discharge:',
    'Attending:',
    'Report ID:',
    'Visit Type:',
    'Generic Name:',
    'Brand Name:',
    'Dosage:',
    'Route:',
    'Frequency:',
    'Purpose / Indication:',
    'Prescribing Physician:',
    'Additional Notes:',
    'Condition Name:',
    'ICD Code:',
    'Diagnosis Date:',
    'Preexisting:',
    'DEMOGRAPHICS',
    'ALLERGIES',
    'INSURANCE',
    'HOSPITAL VISIT',
    'MEDICATIONS',
    'CHRONIC CONDITIONS',
    'LAB RESULTS',
    'VITALS',
    'IMMUNIZATIONS',
    'SOCIAL HISTORY',
    'CARE TEAM',
    'NOTES',
    'Chronic Condition ',
    'Hospital Visit ',
    'Medication ',
    'Allergy ',
    'Insurance ',
  ];
  let t = text;
  for (const label of breaks) {
    const re = new RegExp(`(\\S)\\s+(?=${escapeRe(label)})`, 'gi');
    t = t.replace(re, '$1\n');
  }
  return t.replace(/\n{3,}/g, '\n\n');
}

export function isMeditapDemoRecordDocument(text: string): boolean {
  if (/demo\s+medical\s+record\s+for\s+meditap/i.test(text)) return true;
  if (
    /DEMOGRAPHICS/i.test(text) &&
    /Given Name:/i.test(text) &&
    /(?:CHRONIC CONDITIONS|HOSPITAL VISIT|MEDICATIONS)/i.test(text)
  ) {
    return true;
  }
  // Labeled intake blocks without the demo title (e.g. custom clinic exports).
  return (
    /Given Name:/i.test(text) &&
    /Family Name:/i.test(text) &&
    /(?:Allergy|Insurance|Hospital Visit|Medication|Chronic Condition)\s+\d+/i.test(text)
  );
}

function detectNoKnownDrugAllergies(text: string, parsedCount: number): boolean {
  if (parsedCount > 0) return false;
  return (
    /\bNKDA\b/i.test(text) ||
    /\bNKA\b/i.test(text) ||
    /\bno\s+known\s+(drug\s+)?allergies\b/i.test(text)
  );
}

type LabelDef = { key: string; pattern: RegExp };

function parseFieldsInBlock(block: string, fields: LabelDef[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (let i = 0; i < fields.length; i++) {
    const { key, pattern } = fields[i];
    const startM = block.match(pattern);
    if (!startM || startM.index === undefined) continue;
    const valueStart = startM.index + startM[0].length;
    let valueEnd = block.length;
    for (let j = i + 1; j < fields.length; j++) {
      const nm = block.slice(valueStart).match(fields[j].pattern);
      if (nm && nm.index !== undefined && nm.index > 0) {
        valueEnd = valueStart + nm.index;
        break;
      }
    }
    const raw = cleanValue(block.slice(valueStart, valueEnd));
    if (raw) out[key] = raw;
  }
  return out;
}

function sliceSection(
  text: string,
  startPattern: RegExp,
  endPatterns: RegExp[]
): string {
  const m = text.match(startPattern);
  if (!m || m.index === undefined) return '';
  const start = m.index + m[0].length;
  let end = text.length;
  const tail = text.slice(start);
  for (const ep of endPatterns) {
    const em = tail.match(ep);
    if (em && em.index !== undefined && em.index > 0) {
      end = start + em.index;
      break;
    }
  }
  return text.slice(start, end).trim();
}

function splitNumberedBlocks(section: string, blockPrefix: string): string[] {
  const re = new RegExp(`\\b${escapeRe(blockPrefix)}\\s*(\\d+)\\b`, 'gi');
  const parts: string[] = [];
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  const starts: { index: number; len: number }[] = [];
  while ((m = re.exec(section)) !== null) {
    starts.push({ index: m.index, len: m[0].length });
  }
  if (!starts.length) return section.trim() ? [section.trim()] : [];
  for (let i = 0; i < starts.length; i++) {
    const bodyStart = starts[i].index + starts[i].len;
    const bodyEnd = i + 1 < starts.length ? starts[i + 1].index : section.length;
    const body = section.slice(bodyStart, bodyEnd).trim();
    if (body) parts.push(body);
  }
  return parts;
}

const DEMO_FIELDS: LabelDef[] = [
  { key: 'givenName', pattern: /Given Name:\s*/i },
  { key: 'familyName', pattern: /Family Name:\s*/i },
  { key: 'dateOfBirth', pattern: /Date of Birth:\s*/i },
  { key: 'sexAtBirth', pattern: /Sex at Birth:\s*/i },
  { key: 'bloodType', pattern: /Blood Type:\s*/i },
  { key: 'email', pattern: /Email:\s*/i },
  { key: 'phoneNumber', pattern: /Phone Number:\s*/i },
];

const ALLERGY_FIELDS: LabelDef[] = [
  { key: 'allergen', pattern: /Allergen:\s*/i },
  { key: 'reaction', pattern: /Reaction:\s*/i },
  { key: 'severity', pattern: /Severity:\s*/i },
  { key: 'status', pattern: /Status:\s*/i },
];

const INSURANCE_FIELDS: LabelDef[] = [
  { key: 'providerName', pattern: /Provider Name:\s*/i },
  { key: 'policyNumber', pattern: /Policy Number:\s*/i },
  { key: 'planName', pattern: /Plan Name:\s*/i },
  { key: 'memberID', pattern: /Member ID:\s*/i },
  { key: 'groupNumber', pattern: /Group Number:\s*/i },
  { key: 'startDate', pattern: /Start Date:\s*/i },
  { key: 'endDate', pattern: /End Date:\s*/i },
];

const HOSPITAL_FIELDS: LabelDef[] = [
  { key: 'visitType', pattern: /(?:^|\n)\s*Type:\s*/i },
  { key: 'facilityName', pattern: /Facility:\s*/i },
  { key: 'reason', pattern: /Reason:\s*/i },
  { key: 'visitDate', pattern: /\bDate:\s*/i },
  { key: 'dischargeDate', pattern: /Discharge:\s*/i },
  { key: 'attendingPhysician', pattern: /Attending:\s*/i },
  { key: 'reportId', pattern: /Report ID:\s*/i },
];

const MEDICATION_FIELDS: LabelDef[] = [
  { key: 'genericName', pattern: /Generic Name:\s*/i },
  { key: 'brandName', pattern: /Brand Name:\s*/i },
  { key: 'dosage', pattern: /Dosage:\s*/i },
  { key: 'route', pattern: /Route:\s*/i },
  { key: 'frequency', pattern: /Frequency:\s*/i },
  { key: 'purpose', pattern: /Purpose\s*\/?\s*Indication:\s*/i },
  { key: 'prescribingPhysician', pattern: /Prescribing Physician:\s*/i },
  { key: 'startDate', pattern: /Start Date:\s*/i },
  { key: 'endDate', pattern: /End Date:\s*/i },
  { key: 'notesMedication', pattern: /Notes:\s*/i },
];

const CHRONIC_FIELDS: LabelDef[] = [
  { key: 'conditionName', pattern: /Condition Name:\s*/i },
  { key: 'icdCode', pattern: /ICD Code:\s*/i },
  { key: 'diagnosisDate', pattern: /Diagnosis Date:\s*/i },
  { key: 'preexisting', pattern: /Preexisting:\s*/i },
  { key: 'notesChronicConditions', pattern: /Additional Notes:\s*/i },
];

function normalizeBloodType(text: string): string | undefined {
  const t = text.toUpperCase();
  for (const bt of BLOOD_TYPES) {
    if (t.includes(bt)) return bt;
  }
  return undefined;
}

function guessAllergyType(name: string): string {
  const n = name.toLowerCase();
  if (/\b(penicillin|aspirin|ibuprofen|drug|medication|sulfa)\b/.test(n)) return 'Drug';
  if (/\b(peanut|milk|egg|food|shellfish)\b/.test(n)) return 'Food';
  if (/\b(pollen|dust|latex|mold|environmental)\b/.test(n)) return 'Environmental';
  return '';
}

function parseSex(raw: string): string {
  const m = raw.match(/\b(male|female)\b/i);
  if (!m) return '';
  return m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
}

function parseDemoPatient(section: string): Tab14PatientFields {
  const f = parseFieldsInBlock(section, DEMO_FIELDS);
  const out: Tab14PatientFields = {};
  if (f.givenName) out.givenName = f.givenName.split(/\s+Family Name:/i)[0].trim();
  if (f.familyName) {
    out.familyName = f.familyName.split(/\s+Date of Birth:/i)[0].trim();
  }
  if (f.dateOfBirth) {
    const iso = tryParseDateToIso(f.dateOfBirth.split(/\s+Sex at Birth:/i)[0].trim());
    if (iso) out.dateOfBirth = iso;
  }
  const sex = parseSex(f.sexAtBirth || '');
  if (sex) out.sexAtBirth = sex;
  const bt = normalizeBloodType(f.bloodType || '');
  if (bt) out.bloodType = bt;
  if (f.email) out.email = f.email.split(/\s+Phone/i)[0].trim();
  if (f.phoneNumber) out.phoneNumber = f.phoneNumber.replace(/\s+Address:/i, '').trim();
  return out;
}

function parseDemoAllergies(section: string): Tab14AllergyRow[] {
  return splitNumberedBlocks(section, 'Allergy').map((block) => {
    const f = parseFieldsInBlock(block, ALLERGY_FIELDS);
    const name = f.allergen || '';
    if (!name) return null;
    const statusNote = f.status ? `Status: ${f.status}` : '';
    return {
      allergyName: name,
      allergyType: guessAllergyType(name),
      allergyTypeOther: '',
      severity: f.severity || '',
      reactionNotes: [f.reaction, statusNote].filter(Boolean).join(' — '),
      lastObserved: '',
    };
  }).filter((r): r is Tab14AllergyRow => r !== null);
}

function parseDemoInsurances(section: string): Tab14InsuranceRow[] {
  return splitNumberedBlocks(section, 'Insurance').map((block) => {
    const f = parseFieldsInBlock(block, INSURANCE_FIELDS);
    if (!f.providerName && !f.policyNumber) return null;
    return {
      providerName: (f.providerName || '').split(/\s+Policy Number:/i)[0].trim(),
      policyNumber: (f.policyNumber || '').split(/\s+Plan Name:/i)[0].trim(),
      planName: (f.planName || '').split(/\s+Member ID:/i)[0].trim(),
      memberID: (f.memberID || '').split(/\s+Group Number:/i)[0].trim(),
      groupNumber: (f.groupNumber || '').split(/\s+Start Date:/i)[0].trim(),
      startDate: tryParseDateToIso((f.startDate || '').split(/\s+End Date:/i)[0].trim()) || '',
      endDate: tryParseDateToIso((f.endDate || '').replace(/\*+$/, '').trim()) || '',
    };
  }).filter((r): r is Tab14InsuranceRow => r !== null);
}

function parseDemoMedications(section: string): Tab14MedicationRow[] {
  return splitNumberedBlocks(section, 'Medication').map((block) => {
    const f = parseFieldsInBlock(block, MEDICATION_FIELDS);
    if (!f.genericName) return null;
    const endRaw = f.endDate || '';
    const endIso =
      /ongoing|active/i.test(endRaw) ? '' : tryParseDateToIso(endRaw) || '';
    return {
      genericName: f.genericName.split(/\s+Brand Name:/i)[0].trim(),
      brandName: (f.brandName || '').split(/\s+Dosage:/i)[0].trim(),
      dosage: (f.dosage || '').split(/\s+Route:/i)[0].trim(),
      route: (f.route || '').split(/\s+Frequency:/i)[0].trim(),
      frequency: (f.frequency || '').split(/\s+Purpose/i)[0].trim(),
      purpose: (f.purpose || '').split(/\s+Prescribing Physician:/i)[0].trim(),
      prescribingPhysician: (f.prescribingPhysician || '')
        .split(/\s+Start Date:/i)[0]
        .trim(),
      startDate: tryParseDateToIso((f.startDate || '').split(/\s+End Date:/i)[0].trim()) || '',
      endDate: endIso,
      notesMedication: (f.notesMedication || '').trim(),
    };
  }).filter((r): r is Tab14MedicationRow => r !== null);
}

function parseDemoChronic(section: string): Tab14ChronicRow[] {
  return splitNumberedBlocks(section, 'Chronic Condition').map((block) => {
    const f = parseFieldsInBlock(block, CHRONIC_FIELDS);
    const name = (f.conditionName || '').split(/\s+ICD Code:/i)[0].trim();
    if (!name) return null;
    const pre = (f.preexisting || '').toLowerCase();
    return {
      conditionName: name,
      icdCode: (f.icdCode || '').split(/\s+Diagnosis Date:/i)[0].trim(),
      diagnosisDate:
        tryParseDateToIso((f.diagnosisDate || '').split(/\s+Preexisting:/i)[0].trim()) || '',
      severity: '',
      prexisting: pre.startsWith('y') ? 'Yes' : pre.startsWith('n') ? 'No' : f.preexisting || '',
      notesChronicConditions: (f.notesChronicConditions || '').trim(),
    };
  }).filter((r): r is Tab14ChronicRow => r !== null);
}

function pickHospitalVisit(section: string): Tab14HospitalFields {
  const blocks = splitNumberedBlocks(section, 'Hospital Visit');
  let best: Tab14HospitalFields = {};
  let bestTime = 0;
  for (const block of blocks) {
    const f = parseFieldsInBlock(block, HOSPITAL_FIELDS);
    const visit: Tab14HospitalFields = {
      visitType: (f.visitType || '').split(/\s+Facility:/i)[0].trim(),
      facilityName: (f.facilityName || '').split(/\s+Reason:/i)[0].trim(),
      reason: (f.reason || '').split(/\s+Date:/i)[0].trim(),
      visitDate: tryParseDateToIso((f.visitDate || '').split(/\s+Discharge:/i)[0].trim()) || '',
      dischargeDate:
        tryParseDateToIso((f.dischargeDate || '').split(/\s+Attending:/i)[0].trim()) || '',
      attendingPhysician: (f.attendingPhysician || '')
        .split(/\s+Report ID:/i)[0]
        .trim(),
      reportId: (f.reportId || '').replace(/\*+$/, '').trim(),
    };
    const t = visit.visitDate ? Date.parse(visit.visitDate) : 0;
    if (t >= bestTime) {
      bestTime = t;
      best = visit;
    }
  }
  return best;
}

export function parseMeditapDemoRecordDocument(raw: string): Tab14IntakeParseResult {
  const text = preprocessGluedLabelText(raw.replace(/\r\n/g, '\n'));

  const demoSection = sliceSection(text, /\bDEMOGRAPHICS\b/i, [
    /\bALLERGIES\b/i,
    /\bINSURANCE\b/i,
    /\bHOSPITAL\s*VISIT\b/i,
    /\bMEDICATIONS\b/i,
    /\bCHRONIC\s*CONDITIONS\b/i,
    /\bLAB\s*RESULTS\b/i,
  ]);
  const allergySection = sliceSection(text, /\bALLERGIES\b/i, [
    /\bINSURANCE\b/i,
    /\bHOSPITAL\s*VISIT\b/i,
    /\bMEDICATIONS\b/i,
    /\bCHRONIC\s*CONDITIONS\b/i,
  ]);
  const insuranceSection = sliceSection(text, /\bINSURANCE\b/i, [
    /\bHOSPITAL\s*VISIT\b/i,
    /\bMEDICATIONS\b/i,
    /\bCHRONIC\s*CONDITIONS\b/i,
  ]);
  const hospitalSection = sliceSection(text, /\bHOSPITAL\s*VISIT\b/i, [
    /\bMEDICATIONS\b/i,
    /\bCHRONIC\s*CONDITIONS\b/i,
  ]);
  const medSection = sliceSection(text, /\bMEDICATIONS\b/i, [
    /\bCHRONIC\s*CONDITIONS\b/i,
    /\bLAB\s*RESULTS\b/i,
  ]);
  const chronicSection = sliceSection(text, /\bCHRONIC\s*CONDITIONS\b/i, [
    /\bLAB\s*RESULTS\b/i,
    /\bVITALS\b/i,
  ]);

  const patientFields = parseDemoPatient(demoSection || text);
  const allergies = parseDemoAllergies(allergySection);
  const insurances = parseDemoInsurances(insuranceSection);
  const medications = parseDemoMedications(medSection);
  const chronicConditions = parseDemoChronic(chronicSection);
  const hospitalVisit = pickHospitalVisit(hospitalSection);

  return {
    patientFields,
    noKnownDrugAllergies: detectNoKnownDrugAllergies(text, allergies.length),
    insurances,
    allergies,
    medications,
    chronicConditions,
    hospitalVisit,
  };
}
