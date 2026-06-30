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
  if (isDataPortabilityCompactRecord(text)) return true;
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
  { key: 'address', pattern: /Address:\s*/i },
  { key: 'race', pattern: /Race:\s*/i },
  { key: 'ethnicity', pattern: /Ethnicity:\s*/i },
  { key: 'preferredLanguage', pattern: /Preferred Language:\s*/i },
  { key: 'maritalStatus', pattern: /Marital Status:\s*/i },
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
  if (f.phoneNumber) out.phoneNumber = f.phoneNumber.split(/\s+Address:/i)[0].trim();
  if (f.address) out.address = f.address.split(/\s+Race:/i)[0].trim();
  if (f.race) out.race = f.race.split(/\s+Ethnicity:/i)[0].trim();
  if (f.ethnicity) out.ethnicity = f.ethnicity.split(/\s+Preferred Language:/i)[0].trim();
  if (f.preferredLanguage) {
    out.preferredLanguage = f.preferredLanguage.split(/\s+Marital Status:/i)[0].trim();
  }
  if (f.maritalStatus) out.maritalStatus = f.maritalStatus.replace(/^\*+\s*/, '').replace(/\*+$/, '').trim();
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

/** Compact "Data Portability for Name" exports (Jordan Parker demo PDF). */
export function isDataPortabilityCompactRecord(text: string): boolean {
  const t = preprocessCompactPortabilityText(text);
  return (
    /data\s+portability\s+for\s+[A-Za-z]/i.test(t) &&
    /\bdemographics\b/i.test(t) &&
    /\bsex\s*:/i.test(t) &&
    !/table\s+of\s+contents/i.test(t) &&
    !/given\s+name\s*:/i.test(t)
  );
}

function splitPersonFromPortabilityTitle(text: string): Partial<Tab14PatientFields> {
  const m = text.match(
    /data\s+portability\s+for\s+([A-Za-z][A-Za-z.'-]*(?:\s+[A-Za-z][A-Za-z.'-]*)*?)(?:\s+demographics\b|\s+care\s+team\b|\s+insurance\b|$)/i
  );
  if (!m) return {};
  const parts = m[1].trim().split(/\s+/);
  if (parts.length === 1) return { givenName: parts[0] };
  return { givenName: parts[0], familyName: parts.slice(1).join(' ') };
}

function readCompactLabel(
  block: string,
  label: string,
  nextLabelPatterns: string[]
): string {
  const stops =
    nextLabelPatterns.length > 0
      ? `(?=\\s+(?:${nextLabelPatterns.map(escapeRe).join('|')})\\s*:?\\b|$)`
      : '$';
  const re = new RegExp(`\\b${escapeRe(label)}\\s*:?\\s*([\\s\\S]*?)${stops}`, 'i');
  const m = block.match(re);
  return m ? cleanValue(m[1]) : '';
}

/** Section headers in compact Data Portability PDFs (title case, from Jordan Parker demo). */
const COMPACT_PORTABILITY_HEADERS = [
  'Demographics',
  'Care Team',
  'Insurance',
  'Allergies',
  'Chronic Conditions',
  'Medications',
  'Recent Hospital Visit',
  'Laboratory Results',
  'Vitals',
  'Immunizations',
  'Social History',
  'Notes',
] as const;

/**
 * pdf.js line-break extraction often glues headers to the next token
 * (e.g. DemographicsSex, AllergiesSulfa, MedicationsLosartan).
 */
export function preprocessCompactPortabilityText(text: string): string {
  let t = text.replace(/\r\n/g, '\n');
  for (const header of COMPACT_PORTABILITY_HEADERS) {
    t = t.replace(
      new RegExp(`\\b(${escapeRe(header)})(?=[A-Za-z0-9#:(])`, 'gi'),
      '$1 '
    );
  }
  return t;
}

function parseCompactVitals(text: string): Pick<
  Tab14PatientFields,
  'heightInches' | 'weightLbs' | 'systolicBp' | 'diastolicBp' | 'heartRate'
> {
  const vitals = sliceSection(text, /\bvitals\b/i, [
    /\bimmunizations\b/i,
    /\bsocial\s+history\b/i,
    /\bnotes\b/i,
  ]);
  const out: Pick<
    Tab14PatientFields,
    'heightInches' | 'weightLbs' | 'systolicBp' | 'diastolicBp' | 'heartRate'
  > = {};

  const bp = vitals.match(/\bBP\s+(\d+)\s*\/\s*(\d+)/i);
  if (bp) {
    out.systolicBp = bp[1];
    out.diastolicBp = bp[2];
  }

  const hr = vitals.match(/\bHR\s+(\d+)\b/i);
  if (hr) out.heartRate = hr[1];

  const weightM = vitals.match(/\bweight\s+(\d+(?:\.\d+)?)\s*lb\b/i);
  if (weightM) out.weightLbs = weightM[1];

  const bmiM = vitals.match(/\bBMI\s+(\d+(?:\.\d+)?)/i);
  if (weightM && bmiM && !out.heightInches) {
    const weightKg = parseFloat(weightM[1]) * 0.45359237;
    const bmi = parseFloat(bmiM[1]);
    if (bmi > 0 && weightKg > 0) {
      const heightM = Math.sqrt(weightKg / bmi);
      const heightIn = heightM / 0.0254;
      if (heightIn > 40 && heightIn < 90) {
        out.heightInches = String(Math.round(heightIn * 10) / 10);
      }
    }
  }

  return out;
}

function parseCompactPatient(text: string): Tab14PatientFields {
  const out: Tab14PatientFields = {
    ...splitPersonFromPortabilityTitle(text),
    ...parseCompactVitals(text),
  };
  const demo = sliceSection(text, /\bdemographics\b/i, [
    /\bcare\s+team\b/i,
    /\binsurance\b/i,
    /\ballergies\b/i,
  ]);
  const block = demo || text;

  const sex = readCompactLabel(block, 'Sex', ['DOB', 'Blood Type']);
  if (sex) {
    const parsed = parseSex(sex);
    if (parsed) out.sexAtBirth = parsed;
  }

  const dob = readCompactLabel(block, 'DOB', ['Blood Type', 'Race']);
  if (dob) {
    const iso = tryParseDateToIso(dob);
    if (iso) out.dateOfBirth = iso;
  }

  const btRaw = readCompactLabel(block, 'Blood Type', ['Race', 'Ethnicity']);
  const bt = normalizeBloodType(btRaw || block);
  if (bt) out.bloodType = bt;

  const race = readCompactLabel(block, 'Race', ['Ethnicity', 'Language']);
  if (race) out.race = race;

  const ethnicity = readCompactLabel(block, 'Ethnicity', ['Language', 'Marital Status']);
  if (ethnicity) out.ethnicity = ethnicity;

  const language = readCompactLabel(block, 'Language', ['Marital Status', 'Address']);
  if (language) out.preferredLanguage = language;

  const marital = readCompactLabel(block, 'Marital Status', ['Address', 'Phone']);
  if (marital) out.maritalStatus = marital;

  const address = readCompactLabel(block, 'Address', ['Phone', 'Email']);
  if (address) out.address = address;

  const phone = readCompactLabel(block, 'Phone', ['Email', 'Care Team']);
  if (phone) out.phoneNumber = phone;

  const email = readCompactLabel(block, 'Email', ['Care Team', 'Insurance']);
  if (email) out.email = email.split(/\s+/)[0];

  return out;
}

function parseCompactAllergies(section: string): Tab14AllergyRow[] {
  const rows: Tab14AllergyRow[] = [];
  const normalized = section.replace(/\s+/g, ' ').trim();
  const re =
    /([A-Za-z][A-Za-z0-9\s'-]*?)\s*[-–—]\s*([A-Za-z][A-Za-z0-9\s'-]*?)(?=\s+[A-Z][a-z]+(?:\s+[a-z])*\s*[-–—]|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalized)) !== null) {
    const name = cleanValue(m[1]);
    const reaction = cleanValue(m[2]);
    if (name.length < 2) continue;
    rows.push({
      allergyName: name,
      allergyType: guessAllergyType(name),
      allergyTypeOther: '',
      severity: '',
      reactionNotes: reaction,
      lastObserved: '',
    });
  }
  return rows;
}

function parseCompactChronic(section: string): Tab14ChronicRow[] {
  const rows: Tab14ChronicRow[] = [];
  let normalized = section.replace(/\s+/g, ' ').trim();
  const start = normalized.search(
    /\b(?:essential|hyperlipidemia|type\s+\d|diabetes|asthma|hypertension|[A-Z][a-z]+(?:\s+[A-Za-z]+)*)\s*\([A-Z0-9.]+\)/i
  );
  if (start > 0) normalized = normalized.slice(start);

  const re =
    /([A-Za-z][A-Za-z0-9\s/+-]{2,80}?)\s*\(([A-Z0-9.]+)\)\s*[-–—]\s*Diagnosed\s+(\d{1,2}\/\d{1,2}\/\d{4})/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(normalized)) !== null) {
    const name = m[1].trim();
    const icd = m[2].trim();
    if (!name || /^group\s*#/i.test(name)) continue;
    const iso = tryParseDateToIso(m[3]);
    rows.push({
      conditionName: name,
      icdCode: icd,
      diagnosisDate: iso || '',
      severity: '',
      prexisting: 'Yes',
      notesChronicConditions: '',
    });
  }
  return rows;
}

function parseCompactMedicationLine(raw: string): Tab14MedicationRow | null {
  const trimmed = cleanValue(raw);
  if (!trimmed) return null;

  const withMeta = trimmed.match(
    /^(.+?\d+(?:\.\d+)?\s*(?:mg|mcg|IU|units?)\s+PO\s+\w+)\s*[-–—]\s*([^-–—]+?)\s*[-–—]\s*(Dr\.?\s.+)$/i
  );
  if (withMeta) {
    const drugPart = withMeta[1];
    const drugM = drugPart.match(/^(.+?)\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|IU|units?))\s+(PO\s+\w+)/i);
    return {
      genericName: drugM ? cleanValue(drugM[1]) : drugPart,
      brandName: '',
      dosage: drugM ? drugM[2].trim() : '',
      route: drugM ? drugM[3].split(/\s+/)[0] : 'PO',
      frequency: drugM ? drugM[3].split(/\s+/).slice(1).join(' ') : '',
      startDate: '',
      endDate: '',
      purpose: cleanValue(withMeta[2]),
      prescribingPhysician: cleanValue(withMeta[3]),
      notesMedication: '',
    };
  }

  const simple = trimmed.match(/^(.+?\d+(?:\.\d+)?\s*(?:mg|mcg|IU|units?)\s+PO\s+\w+)/i);
  if (!simple) return null;
  const drugPart = simple[1];
  const drugM = drugPart.match(/^(.+?)\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|IU|units?))\s+(PO\s+\w+)/i);
  return {
    genericName: drugM ? cleanValue(drugM[1]) : drugPart,
    brandName: '',
    dosage: drugM ? drugM[2].trim() : '',
    route: drugM ? drugM[3].split(/\s+/)[0] : 'PO',
    frequency: drugM ? drugM[3].split(/\s+/).slice(1).join(' ') : '',
    startDate: '',
    endDate: '',
    purpose: '',
    prescribingPhysician: '',
    notesMedication: '',
  };
}

function parseCompactMedications(section: string): Tab14MedicationRow[] {
  const normalized = section.replace(/\s+/g, ' ').trim();
  const starts: number[] = [];
  const startRe =
    /\b([A-Z][A-Za-z0-9\s.-]*?\d+(?:\.\d+)?\s*(?:mg|mcg|IU|units?)\s+PO\s+\w+)/g;
  let sm: RegExpExecArray | null;
  while ((sm = startRe.exec(normalized)) !== null) {
    starts.push(sm.index);
  }

  const rows: Tab14MedicationRow[] = [];
  for (let i = 0; i < starts.length; i += 1) {
    const chunk = normalized
      .slice(starts[i], i + 1 < starts.length ? starts[i + 1] : normalized.length)
      .trim();
    const row = parseCompactMedicationLine(chunk);
    if (row && !rows.some((r) => r.genericName === row.genericName && r.dosage === row.dosage)) {
      rows.push(row);
    }
  }
  return rows;
}

function parseCompactInsurance(section: string): Tab14InsuranceRow[] {
  const provider = readCompactLabel(section, 'Provider', ['Policy #', 'Policy Number']);
  const policy = readCompactLabel(section, 'Policy #', ['Plan', 'Member ID']);
  if (!provider && !policy) return [];

  const plan = readCompactLabel(section, 'Plan', ['Member ID', 'Group #']);
  const memberId = readCompactLabel(section, 'Member ID', ['Group #', 'Coverage']);
  const group = readCompactLabel(section, 'Group #', ['Coverage', 'Start Date']);

  let startDate = '';
  let endDate = '';
  const coverage = readCompactLabel(section, 'Coverage', ['Allergies', 'Chronic']);
  const covM = coverage.match(
    /(\d{1,2}\/\d{1,2}\/\d{4})\s*[–—-]\s*(\d{1,2}\/\d{1,2}\/\d{4})/
  );
  if (covM) {
    startDate = tryParseDateToIso(covM[1]) || '';
    endDate = tryParseDateToIso(covM[2]) || '';
  }

  return [
    {
      providerName: provider,
      policyNumber: policy,
      planName: plan,
      memberID: memberId,
      groupNumber: group,
      startDate,
      endDate,
    },
  ];
}

function parseCompactHospital(section: string): Tab14HospitalFields {
  return {
    visitType: readCompactLabel(section, 'Type', ['Facility', 'Reason']),
    facilityName: readCompactLabel(section, 'Facility', ['Reason', 'Date']),
    reason: readCompactLabel(section, 'Reason', ['Date', 'Discharge']),
    visitDate: tryParseDateToIso(readCompactLabel(section, 'Date', ['Discharge', 'Outcome'])) || '',
    dischargeDate:
      tryParseDateToIso(readCompactLabel(section, 'Discharge', ['Outcome', 'Attending'])) || '',
    attendingPhysician: readCompactLabel(section, 'Attending', ['Report ID', 'Outcome']),
    reportId: readCompactLabel(section, 'Report ID', ['Outcome', 'Laboratory']),
  };
}

function parseDataPortabilityCompactRecord(raw: string): Tab14IntakeParseResult {
  const text = preprocessCompactPortabilityText(raw.replace(/\r\n/g, '\n'));

  const allergySection = sliceSection(text, /\ballergies\b/i, [
    /\bchronic\s+conditions\b/i,
    /\bmedications\b/i,
  ]);
  const chronicSection = sliceSection(text, /\bchronic\s+conditions\b/i, [
    /\bmedications\b/i,
    /\brecent\s+hospital\s+visit\b/i,
  ]);
  const medSection = sliceSection(text, /\bmedications\b/i, [
    /\brecent\s+hospital\s+visit\b/i,
    /\bhospital\s+visit\b/i,
    /\blaboratory\s+results\b/i,
  ]);
  const insuranceSection = sliceSection(text, /\binsurance\b/i, [
    /\ballergies\b/i,
    /\bchronic\s+conditions\b/i,
  ]);
  const hospitalSection = sliceSection(text, /\b(?:recent\s+)?hospital\s+visit\b/i, [
    /\blaboratory\s+results\b/i,
    /\bvitals\b/i,
  ]);

  const allergies = parseCompactAllergies(allergySection);
  const chronicConditions = parseCompactChronic(chronicSection);
  const medications = parseCompactMedications(medSection);
  const insurances = parseCompactInsurance(insuranceSection);
  const hospitalVisit = parseCompactHospital(hospitalSection);

  return {
    patientFields: parseCompactPatient(text),
    noKnownDrugAllergies: detectNoKnownDrugAllergies(text, allergies.length),
    insurances,
    allergies,
    medications,
    chronicConditions,
    hospitalVisit,
  };
}

export function parseMeditapDemoRecordDocument(raw: string): Tab14IntakeParseResult {
  const normalized = raw.replace(/\r\n/g, '\n');
  if (isDataPortabilityCompactRecord(normalized)) {
    return parseDataPortabilityCompactRecord(normalized);
  }

  const text = preprocessGluedLabelText(normalized);

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
