/**
 * Parser for Riverbend Health Information Exchange synthetic exports
 * (column labels with single or multi-space separators — e.g. Lucas Martinez pediatric packet).
 */

import { tryParseDateToIso } from './intakeDateParse';
import type {
  Tab14ChronicRow,
  Tab14HospitalFields,
  Tab14IntakeParseResult,
  Tab14MedicationRow,
  Tab14PatientFields,
} from './tab14IntakeTypes';

function collapseWs(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function splitPersonName(full: string): { given?: string; family?: string } {
  const parts = collapseWs(full)
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { given: parts[0] };
  if (parts.length === 2) return { given: parts[0], family: parts[1] };
  return {
    given: parts.slice(0, -1).join(' '),
    family: parts[parts.length - 1],
  };
}

const SECTION_HEADERS =
  'GROWTH DATA|IMMUNIZATION HISTORY|PROBLEMS|MISSING FIELDS|ENCOUNTER NOTE \\d+|DIAGNOSIS|PATHOLOGY SUMMARY|CHEMOTHERAPY ADMINISTRATION|LABS|ECG REPORT|ECHOCARDIOGRAM|STRESS TEST|MEDICATIONS|URGENT CARE|DENTAL NOTE|IMAGING|OUTSIDE LAB|DUPLICATE/CONFLICTING MED LISTS|Packet includes';

const DEMO_FIELD_LABELS = [
  'Child Name',
  'Interpreter Needed',
  'Preferred Language',
  'Blood Type',
  'Address',
  'Guardian',
  'Insurance',
  'School',
  'Phone',
  'MRN',
  'DOB',
  'Sex',
  'Name',
];

/** Insert line breaks before section headers when PDF text is one long line. */
export function preprocessRiverbendGluedText(text: string): string {
  let t = text.replace(/\r\n/g, '\n');
  const tokens = [
    'PATIENT DEMOGRAPHICS',
    'GROWTH DATA',
    'IMMUNIZATION HISTORY',
    'PROBLEMS',
    'MISSING FIELDS',
    'ENCOUNTER NOTE 1',
    'ENCOUNTER NOTE 2',
    'ENCOUNTER NOTE 3',
    'ENCOUNTER NOTE 4',
    'ENCOUNTER NOTE 5',
    'DIAGNOSIS',
    'PATHOLOGY SUMMARY',
    'CHEMOTHERAPY ADMINISTRATION',
    'LABS',
    'ECG REPORT',
    'ECHOCARDIOGRAM',
    'STRESS TEST',
    'MEDICATIONS',
    'URGENT CARE',
    'DENTAL NOTE',
    'IMAGING',
    'OUTSIDE LAB',
    'DUPLICATE/CONFLICTING MED LISTS',
  ];
  for (const token of tokens.sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`\\s+(${escapeRe(token)})\\b`, 'gi');
    t = t.replace(re, `\n$1`);
  }
  t = t.replace(/(ENCOUNTER NOTE \d+)(Date:)/gi, '$1\n$2');
  return t;
}

export function isRiverbendHieDocument(text: string): boolean {
  const t = text.replace(/\s+/g, ' ');
  return (
    /Riverbend Health Information Exchange/i.test(t) ||
    (/Synthetic dummy record for MediTap parser testing/i.test(t) &&
      /PATIENT DEMOGRAPHICS/i.test(t))
  );
}

function extractDemographicsSection(text: string): string {
  const m = text.match(
    new RegExp(
      `PATIENT DEMOGRAPHICS\\s+(.*?)(?=\\b(?:${SECTION_HEADERS})\\b|$)`,
      'is'
    )
  );
  return m?.[1]?.trim() ?? '';
}

/** Parse "Label Value Label Value …" blocks (single-space columns from pdf.js). */
function parseDemographicsFieldMap(section: string): Record<string, string> {
  const fields: Record<string, string> = {};
  if (!section.trim()) return fields;

  const labelAlt = DEMO_FIELD_LABELS.map(escapeRe)
    .sort((a, b) => b.length - a.length)
    .join('|');
  const re = new RegExp(`\\b(${labelAlt})\\s+`, 'gi');
  const matches = [...section.matchAll(re)];

  for (let i = 0; i < matches.length; i++) {
    const label = matches[i][1];
    const start = matches[i].index! + matches[i][0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index! : section.length;
    const value = collapseWs(section.slice(start, end));
    if (value && !/^not listed|missing|redacted|blank$/i.test(value)) {
      fields[label.toLowerCase()] = value;
    }
  }
  return fields;
}

function parseDemographics(text: string): Tab14PatientFields {
  const out: Tab14PatientFields = {};
  const fields = parseDemographicsFieldMap(extractDemographicsSection(text));

  const full = fields['child name'] || fields.name;
  if (full) {
    const { given, family } = splitPersonName(full);
    if (given) out.givenName = given;
    if (family) out.familyName = family;
  }

  const dobRaw = fields.dob;
  if (dobRaw) {
    const iso = tryParseDateToIso(dobRaw);
    if (iso) out.dateOfBirth = iso;
  }

  const sex = fields.sex;
  if (sex && /^(male|female)$/i.test(sex)) {
    out.sexAtBirth = sex.charAt(0).toUpperCase() + sex.slice(1).toLowerCase();
  }

  const phone = fields.phone;
  if (phone) out.phoneNumber = phone;

  const bt = fields['blood type'];
  if (bt && /^[ABO]{1,2}[+-]$/i.test(bt.replace(/\s/g, ''))) {
    out.bloodType = bt.toUpperCase();
  }

  const addr = fields.address;
  if (addr) out.address = addr;

  const lang = fields['preferred language'];
  if (lang) out.preferredLanguage = lang;

  return out;
}

function sliceSection(text: string, header: RegExp, until: RegExp): string {
  const m = text.match(
    new RegExp(`${header.source}\\s*(.+?)(?=${until.source}|$)`, 'is')
  );
  return m?.[1]?.trim() ?? '';
}

function parseMedicationSentence(block: string): Tab14MedicationRow[] {
  const rows: Tab14MedicationRow[] = [];
  const parts = block.split(/[;.\n]+/).map((p) => p.trim()).filter(Boolean);
  for (const raw of parts) {
    if (raw.length < 4) continue;
    if (/^(list [abc]|no active meds|medication list|oral contraceptive discontinued)/i.test(raw)) {
      continue;
    }
    const dose = raw.match(/\b(\d+(?:\.\d+)?(?:\s*\/\s*\d+)?\s*(?:mg|mcg|g|units?))\b/i);
    const freq = raw.match(
      /\b(BID|TID|QID|daily|once daily|twice daily|q\.?d\.?|b\.?i\.?d\.?|prn|weekly)\b/i
    );
    let generic = raw;
    if (dose) generic = raw.slice(0, raw.indexOf(dose[0])).trim();
    generic = generic.replace(/^[-•*\d.)]+\s*/, '').trim();
    if (generic.length < 2) continue;
    if (/^(nitrofurantoin|carvedilol|entresto|aspirin|oral contraceptive)/i.test(generic) || dose) {
      rows.push({
        genericName: generic.split(/\s+/).slice(0, 3).join(' '),
        brandName: '',
        dosage: dose?.[1] ?? '',
        route: '',
        frequency: freq?.[1] ?? '',
        startDate: '',
        endDate: '',
        purpose: '',
        prescribingPhysician: '',
        notesMedication: '',
      });
    }
  }
  return rows;
}

function parseChronicFromNarrative(block: string): Tab14ChronicRow[] {
  const rows: Tab14ChronicRow[] = [];
  if (!block.trim()) return rows;

  const icdMatch = block.match(/\bICD[-\s]?([A-Z]\d{2}(?:\.\d+)?)\b/i);
  const icd = icdMatch ? icdMatch[1].toUpperCase() : '';

  const sentences = block
    .split(/[.;]\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 8 && !/^missing fields/i.test(s));

  for (const s of sentences.slice(0, 6)) {
    if (/^(stage|grade|specimen|cycle|regimen|margins|sentinel)/i.test(s)) continue;
    rows.push({
      conditionName: s.slice(0, 180),
      icdCode: icd,
      diagnosisDate: '',
      severity: '',
      prexisting: '',
      notesChronicConditions: '',
    });
  }
  return rows;
}

function parseHospitalFromEncounters(text: string): Tab14HospitalFields {
  const urgent = text.match(
    /URGENT CARE\s+Date\s+(\d{1,2}\/\d{1,2}\/\d{4})\.\s*Reason:\s*([^.]+)/i
  );
  if (urgent) {
    return {
      visitDate: tryParseDateToIso(urgent[1]) ?? '',
      reason: collapseWs(urgent[2]),
      visitType: 'Urgent care',
      facilityName: 'Urgent care',
    };
  }

  const encounters = [
    ...text.matchAll(
      /Date:\s*(\d{4}-\d{2}-\d{2})\s+Facility:\s*([^C\n]+?)\s+Chief Complaint:/gi
    ),
  ];
  if (encounters.length) {
    const latest = encounters[encounters.length - 1];
    const facility = collapseWs(latest[2]);
    return {
      visitDate: latest[1],
      facilityName: facility,
      visitType: 'Follow-up',
      reason: 'Follow-up and review of active problems',
    };
  }

  return {};
}

function parseAllergiesFromProblems(text: string): { rows: Tab14IntakeParseResult['allergies']; nkda: boolean } {
  const problems = sliceSection(text, /PROBLEMS\b/i, /MISSING FIELDS|ENCOUNTER NOTE|DIAGNOSIS/i);
  const dental = sliceSection(text, /DENTAL NOTE\b/i, /IMAGING|OUTSIDE LAB|DUPLICATE|ENCOUNTER/i);
  if (/allergy section blank/i.test(dental)) {
    return { rows: [], nkda: false };
  }
  const rows: Tab14IntakeParseResult['allergies'] = [];
  if (/seasonal allergies/i.test(problems)) {
    rows.push({
      allergyName: 'Seasonal allergies',
      allergyType: 'Environmental',
      allergyTypeOther: '',
      severity: '',
      reactionNotes: '',
      lastObserved: '',
    });
  }
  return { rows, nkda: false };
}

export function parseRiverbendHieDocument(raw: string): Tab14IntakeParseResult {
  const text = preprocessRiverbendGluedText(raw);
  const patientFields = parseDemographics(text);

  const medBlock =
    sliceSection(text, /\bMEDICATIONS\b/i, /MISSING FIELDS|ENCOUNTER NOTE|URGENT CARE/i) ||
    sliceSection(text, /DUPLICATE\/CONFLICTING MED LISTS/i, /MISSING FIELDS|ENCOUNTER/i);

  let medications = parseMedicationSentence(medBlock);
  if (medications.length === 0) {
    const urgent = sliceSection(text, /URGENT CARE\b/i, /DENTAL NOTE|IMAGING|OUTSIDE/i);
    medications = parseMedicationSentence(urgent);
  }
  if (medications.length === 0 && /nitrofurantoin/i.test(text)) {
    medications = parseMedicationSentence(
      text.match(/nitrofurantoin[^.]+\./i)?.[0] ?? ''
    );
  }
  if (medications.length === 0 && /List A:/i.test(text)) {
    const listA = text.match(/List A:\s*([^.]+)/i)?.[1];
    if (listA) medications = parseMedicationSentence(listA);
  }

  const diagnosis = sliceSection(text, /\bDIAGNOSIS\b/i, /PATHOLOGY|CHEMOTHERAPY|LABS|MISSING|ENCOUNTER/i);
  const problems = sliceSection(text, /\bPROBLEMS\b/i, /MISSING FIELDS|ENCOUNTER NOTE/i);
  let chronicConditions = parseChronicFromNarrative(diagnosis);
  if (chronicConditions.length === 0) {
    chronicConditions = parseChronicFromNarrative(problems);
  }

  const { rows: allergies, nkda } = parseAllergiesFromProblems(text);
  const hospitalVisit = parseHospitalFromEncounters(text);

  return {
    patientFields,
    noKnownDrugAllergies: nkda,
    insurances: [],
    allergies,
    medications,
    chronicConditions,
    hospitalVisit,
  };
}
