/**
 * Heuristic extraction of Tab14 intake fields from plain text (PDF text layer or OCR).
 * Not a substitute for clinical validation — users should review before Save.
 */

import { normalizeExtractedDocumentText } from './documentTextExtraction';

export type Tab14PatientFields = Partial<{
  givenName: string;
  familyName: string;
  dateOfBirth: string;
  bloodType: string;
  email: string;
  phoneNumber: string;
  sexAtBirth: string;
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

export interface Tab14IntakeParseResult {
  patientFields: Tab14PatientFields;
  /** When true, caller should set allergies UI to NKDA / empty list. */
  noKnownDrugAllergies: boolean;
  insurances: Tab14InsuranceRow[];
  allergies: Tab14AllergyRow[];
  medications: Tab14MedicationRow[];
  chronicConditions: Tab14ChronicRow[];
  hospitalVisit: Tab14HospitalFields;
}

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

function collapseWs(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

function pickDefined<T extends Record<string, string>>(obj: Partial<T>): Partial<T> {
  const out: Partial<T> = {};
  for (const k of Object.keys(obj) as (keyof T)[]) {
    const v = obj[k];
    if (typeof v === 'string' && v.trim()) (out as Record<string, string>)[k as string] = v.trim();
  }
  return out;
}

/** Parse many date styles to YYYY-MM-DD when unambiguous. */
export function tryParseDateToIso(raw: string): string | undefined {
  const s = raw.trim();
  if (!s) return undefined;
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) {
    const d = new Date(+m[1], +m[2] - 1, +m[3]);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
  }
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const mo = +m[1];
    const day = +m[2];
    const y = +m[3];
    if (mo >= 1 && mo <= 12 && day >= 1 && day <= 31) {
      const d = new Date(y, mo - 1, day);
      return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
    }
  }
  m = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
  if (m) {
    const mo = +m[1];
    const day = +m[2];
    const y = +m[3];
    if (mo >= 1 && mo <= 12 && day >= 1 && day <= 31) {
      const d = new Date(y, mo - 1, day);
      return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
    }
  }
  m = s.match(
    /^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})$/i
  );
  if (m) {
    const months: Record<string, number> = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      sept: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };
    const moKey = m[1].toLowerCase().slice(0, 3) as keyof typeof months;
    const mo = months[moKey];
    if (mo === undefined) return undefined;
    const d = new Date(+m[3], mo, +m[2]);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
  }
  m = s.match(/^(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s+(\d{4})$/i);
  if (m) {
    const months: Record<string, number> = {
      jan: 0,
      feb: 1,
      mar: 2,
      apr: 3,
      may: 4,
      jun: 5,
      jul: 6,
      aug: 7,
      sep: 8,
      sept: 8,
      oct: 9,
      nov: 10,
      dec: 11,
    };
    const moKey = m[2].toLowerCase().slice(0, 3) as keyof typeof months;
    const mo = months[moKey];
    if (mo === undefined) return undefined;
    const d = new Date(+m[3], mo, +m[1]);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
  }
  return undefined;
}

function normalizeBloodType(text: string): string | undefined {
  const t = collapseWs(text).toUpperCase();
  const m = t.match(/\b(TYPE\s*)?(A|B|AB|O)\s*([+-])\b/);
  if (m) {
    const code = `${m[2]}${m[3]}`;
    if ((BLOOD_TYPES as readonly string[]).includes(code)) return code;
  }
  for (const bt of BLOOD_TYPES) {
    if (t.includes(bt)) return bt;
  }
  return undefined;
}

/** Capture stays on one line — avoids greedy `.+` swallowing the whole document. */
const LINE_VALUE = '([^\\n]+)';

function labelValue(text: string, labels: RegExp[]): string | undefined {
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  for (const line of lines) {
    for (const re of labels) {
      const m = line.match(re);
      if (m && m[1]) return collapseWs(m[1]);
    }
  }
  return undefined;
}

/** "Maria Elena Rodriguez" → given "Maria Elena", family "Rodriguez". */
function splitPersonName(full: string): { given?: string; family?: string } {
  const parts = collapseWs(full)
    .split(/\s+/)
    .filter((p) => p.length > 0);
  if (parts.length === 0) return {};
  if (parts.length === 1) return { given: parts[0] };
  if (parts.length === 2) return { given: parts[0], family: parts[1] };
  return {
    given: parts.slice(0, -1).join(' '),
    family: parts[parts.length - 1],
  };
}

const NAME_CHARS = "A-Za-zÀ-ÿ\\u00C0-\\u024F'\\-";

function parsePatientFields(text: string): Tab14PatientFields {
  const t = text;
  const out: Tab14PatientFields = {};

  const given = labelValue(t, [
    new RegExp(`(?:given|first)\\s*name\\s*[:#]?\\s*${LINE_VALUE}`, 'i'),
  ]);
  const family = labelValue(t, [
    new RegExp(`(?:family|last)\\s*name\\s*[:#]?\\s*${LINE_VALUE}`, 'i'),
  ]);
  if (given) out.givenName = given;
  if (family) out.familyName = family;

  const fullNameLine = labelValue(t, [
    new RegExp(`(?:patient\\s*name|full\\s*name|name)\\s*[:#]?\\s*${LINE_VALUE}`, 'i'),
  ]);
  if (fullNameLine) {
    const split = splitPersonName(fullNameLine);
    if (!out.givenName && split.given) out.givenName = split.given;
    if (!out.familyName && split.family) out.familyName = split.family;
  }

  if (!out.givenName || !out.familyName) {
    const namePair = t.match(
      new RegExp(
        `patient\\s*name\\s*[:#]?\\s*([${NAME_CHARS}]+)\\s+([${NAME_CHARS}]+(?:\\s+[${NAME_CHARS}]+)*)`,
        'i'
      )
    );
    if (namePair) {
      if (!out.givenName) out.givenName = namePair[1];
      if (!out.familyName) out.familyName = collapseWs(namePair[2]);
    }
  }

  if (!out.givenName || !out.familyName) {
    const m2 = t.match(
      new RegExp(
        `(?:^|\\n)\\s*(?:name|patient)\\s*[:#]\\s*([${NAME_CHARS}]+)\\s+([${NAME_CHARS}]+(?:\\s+[${NAME_CHARS}]+)*)\\s*(?:\\n|$)`,
        'im'
      )
    );
    if (m2) {
      if (!out.givenName) out.givenName = m2[1];
      if (!out.familyName) out.familyName = collapseWs(m2[2]);
    }
  }

  const dobRaw =
    labelValue(t, [
      new RegExp(`(?:date\\s*of\\s*birth|d\\.?o\\.?b\\.?|birth\\s*date)\\s*[:#]?\\s*${LINE_VALUE}`, 'i'),
      new RegExp(`\\bborn\\s+${LINE_VALUE}`, 'i'),
    ]) || undefined;
  if (dobRaw) {
    const iso = tryParseDateToIso(dobRaw) || tryParseDateToIso(dobRaw.split(/[,\s]+/).slice(0, 5).join(' '));
    if (iso) out.dateOfBirth = iso;
  }
  if (!out.dateOfBirth) {
    const isoInline = t.match(/\b(\d{4}-\d{2}-\d{2})\b/);
    if (isoInline) out.dateOfBirth = isoInline[1];
  }

  const em = t.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (em) out.email = em[0];

  const ph = t.match(/(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}\b/);
  if (ph) out.phoneNumber = ph[0].replace(/\s+/g, ' ').trim();

  const sexL = labelValue(t, [
    /sex\s*(?:at\s*birth|assigned)?\s*[:#]?\s*(male|female)\b/i,
  ]);
  if (sexL) {
    const s = sexL.charAt(0).toUpperCase() + sexL.slice(1).toLowerCase();
    if (s === 'Male' || s === 'Female') out.sexAtBirth = s;
  }
  if (!out.sexAtBirth) {
    const sx = t.match(/\b(?:sex|gender)\b[^.\n]{0,40}\b(Male|Female)\b/i);
    if (sx) out.sexAtBirth = sx[1].charAt(0).toUpperCase() + sx[1].slice(1).toLowerCase();
  }

  const bt = labelValue(t, [
    new RegExp(`blood\\s*type\\s*[:#]?\\s*${LINE_VALUE}`, 'i'),
  ]);
  if (bt) {
    const n = normalizeBloodType(bt);
    if (n) out.bloodType = n;
  }
  if (!out.bloodType) {
    const n2 = normalizeBloodType(t);
    if (n2) out.bloodType = n2;
  }

  return pickDefined(out as Record<string, string>);
}

const SECTION_END = /^(insurance|allergies|medications?|medication\s*list|chronic|conditions?|problem\s*list|hospital|admission|visit\s*history|demographics|patient\s*information)\b/i;

function sliceAfterHeader(lines: string[], headerRe: RegExp): string[] {
  const idx = lines.findIndex((l) => headerRe.test(l));
  if (idx < 0) return [];
  const out: string[] = [];
  for (let i = idx + 1; i < lines.length; i++) {
    const l = lines[i];
    if (!l) continue;
    if (SECTION_END.test(l) && !headerRe.test(l)) break;
    if (l.length > 200) break;
    out.push(l);
    if (out.length > 80) break;
  }
  return out;
}

function guessAllergyType(name: string): string {
  const n = name.toLowerCase();
  if (/\b(penicillin|aspirin|ibuprofen|drug|medication|sulfa|insulin)\b/.test(n)) return 'Drug';
  if (/\b(peanut|milk|egg|shellfish|soy|wheat|food)\b/.test(n)) return 'Food';
  if (/\b(pollen|dust|latex|mold|cat|dog|environmental)\b/.test(n)) return 'Environmental';
  return '';
}

function parseAllergyRows(sectionLines: string[], fullText: string): Tab14AllergyRow[] {
  const rows: Tab14AllergyRow[] = [];
  if (/\bNKDA\b/i.test(fullText) || /no\s+known\s+(drug\s+)?allergies/i.test(fullText)) {
    return rows;
  }
  const bullet = /^[-•*]\s*(.+)$/;
  const numbered = /^\d+[.)]\s*(.+)$/;
  for (const line of sectionLines) {
    const m = line.match(bullet) || line.match(numbered);
    const body = m ? m[1] : line.includes(':') ? line : '';
    if (!body) continue;
    const parts = body.split(/[—–-]\s*/).map((s) => s.trim());
    const name = parts[0].replace(/^(allergy|allergic to)\s*:?\s*/i, '').trim();
    if (name.length < 2 || name.length > 120) continue;
    if (/^(none|n\/a|see below)\b/i.test(name)) continue;
    const reaction = parts.slice(1).join(' — ');
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

function parseMedicationRows(sectionLines: string[]): Tab14MedicationRow[] {
  const rows: Tab14MedicationRow[] = [];
  const medLine =
    /^[-*\d.)]+\s*(.+)$|^(?:medication|drug|rx)\s*[:#]?\s*(.+)$/i;
  for (const line of sectionLines) {
    let raw = line.trim();
    const m = raw.match(medLine);
    if (m) raw = (m[1] || m[2] || '').trim();
    if (raw.length < 3) continue;
    const dose = raw.match(/\b(\d+(?:\.\d+)?\s*(?:mg|mcg|g))\b/i);
    const routeM = raw.match(/\b(PO|ORAL|IV|IM|SUBQ|TOPICAL|INHALATION)\b/i);
    const freqM = raw.match(
      /\b(once\s+daily|twice\s+daily|three\s+times\s+daily|q\.?d\.?|b\.?i\.?d\.?|t\.?i\.?d\.?|q\.?i\.?d\.?|q\s*\d+h|weekly|prn)\b/i
    );
    const namePart = dose ? raw.slice(0, raw.indexOf(dose[0])).trim() : raw;
    const generic = namePart.replace(/\s*\([^)]+\)\s*$/, '').trim() || namePart;
    const brandM = namePart.match(/\(([^)]+)\)/);
    rows.push({
      genericName: generic,
      brandName: brandM ? brandM[1].trim() : '',
      dosage: dose ? dose[1].trim() : '',
      route: routeM ? routeM[1].charAt(0).toUpperCase() + routeM[1].slice(1).toLowerCase() : '',
      frequency: freqM ? freqM[1] : '',
      startDate: '',
      endDate: '',
      purpose: '',
      prescribingPhysician: '',
      notesMedication: '',
    });
  }
  return rows;
}

const ICD_RE = /\b([A-TV-Z]\d{2}(?:\.\d+)?[A-Z0-9]{0,4})\b/;

function parseChronicRows(sectionLines: string[], fullText: string): Tab14ChronicRow[] {
  const rows: Tab14ChronicRow[] = [];
  const pool = sectionLines.length ? sectionLines : fullText.split(/\r?\n/).map((l) => l.trim());
  for (const line of pool) {
    const icd = line.match(ICD_RE);
    if (!icd) continue;
    const rest = line.replace(icd[0], '').replace(/^[-•*\d.)]+\s*/, '').trim();
    const name = rest.replace(/^[-–—:]\s*/, '').trim() || line.replace(icd[0], '').trim();
    if (!name || name.length < 3) continue;
    rows.push({
      conditionName: name.slice(0, 200),
      icdCode: icd[1],
      diagnosisDate: '',
      severity: '',
      prexisting: '',
      notesChronicConditions: '',
    });
  }
  return rows.slice(0, 20);
}

function parseInsuranceFromText(text: string): Tab14InsuranceRow[] {
  const rows: Tab14InsuranceRow[] = [];
  const one: Tab14InsuranceRow = {
    providerName: '',
    policyNumber: '',
    planName: '',
    memberID: '',
    groupNumber: '',
    startDate: '',
    endDate: '',
  };
  const payer =
    labelValue(text, [
      /(?:payer|insurance|carrier|provider)\s*name\s*[:#]?\s*([^\n]+)/i,
      /\b(Blue\s+Cross|UnitedHealthcare|Aetna|Cigna|Humana|Medicare|Medicaid|Kaiser|UHC|BCBS)\b/i,
    ]) || '';
  if (payer) one.providerName = payer.replace(/\s*\(.*$/, '').trim();

  const plan = labelValue(text, [/plan\s*name\s*[:#]?\s*([^\n]+)/i]);
  if (plan) one.planName = plan;

  const mem =
    labelValue(text, [/member\s*(?:id|#|number)?\s*[:#]?\s*([A-Z0-9\-]{4,})/i]) ||
    text.match(/\b(?:subscriber|member)\s*id\s*[:#]?\s*([A-Z0-9\-]{4,})/i)?.[1];
  if (mem) one.memberID = mem.trim();

  const grp = labelValue(text, [/group\s*(?:number|#|id)?\s*[:#]?\s*([A-Z0-9\-]{2,})/i]);
  if (grp) one.groupNumber = grp.trim();

  const pol = labelValue(text, [/policy\s*(?:number|#|id)?\s*[:#]?\s*([A-Z0-9\-]{4,})/i]);
  if (pol) one.policyNumber = pol.trim();

  const eff = labelValue(text, [/(?:effective|start)\s*date\s*[:#]?\s*([^\n]+)/i]);
  if (eff) {
    const iso = tryParseDateToIso(eff);
    if (iso) one.startDate = iso;
  }
  const exp = labelValue(text, [/(?:expir|end)\s*date\s*[:#]?\s*([^\n]+)/i]);
  if (exp) {
    const iso = tryParseDateToIso(exp);
    if (iso) one.endDate = iso;
  }

  if (
    one.providerName ||
    one.memberID ||
    one.groupNumber ||
    one.policyNumber ||
    one.planName
  ) {
    rows.push(one);
  }
  return rows;
}

function parseHospital(text: string): Tab14HospitalFields {
  const out: Tab14HospitalFields = {};
  const fac = labelValue(text, [
    /(?:facility|hospital|institution)\s*[:#]?\s*([^\n]+)/i,
    /admitted\s+to\s+([^\n]+)/i,
  ]);
  if (fac) out.facilityName = fac.slice(0, 200);

  const reason = labelValue(text, [/reason\s*(?:for\s*(?:visit|admission))?\s*[:#]?\s*([^\n]+)/i]);
  if (reason) out.reason = reason.slice(0, 300);

  const admit = labelValue(text, [
    /(?:admission|admit|visit)\s*date\s*[:#]?\s*([^\n]+)/i,
    /(?:date\s*of\s*service)\s*[:#]?\s*([^\n]+)/i,
  ]);
  if (admit) {
    const iso = tryParseDateToIso(admit);
    if (iso) out.visitDate = iso;
  }
  const disc = labelValue(text, [/discharge\s*date\s*[:#]?\s*([^\n]+)/i]);
  if (disc) {
    const iso = tryParseDateToIso(disc);
    if (iso) out.dischargeDate = iso;
  }
  const att = labelValue(text, [
    /(?:attending|provider|physician)\s*[:#]?\s*([^\n]+)/i,
    /\b(Dr\.?\s+[A-Za-z][^\n]{2,80})\b/,
  ]);
  if (att) out.attendingPhysician = att.trim().slice(0, 120);

  const vt = labelValue(text, [/visit\s*type\s*[:#]?\s*([^\n]+)/i]);
  if (vt) out.visitType = vt.trim().slice(0, 120);

  const rid = labelValue(text, [/report\s*id\s*[:#]?\s*([A-Z0-9-]+)/i]);
  if (rid) out.reportId = rid.trim();

  return pickDefined(out as Record<string, string>);
}

/**
 * Parse free-text (from PDF text layer or OCR) into Tab14-shaped structures.
 */
export function parseTab14IntakeDocument(raw: string): Tab14IntakeParseResult {
  const text = normalizeExtractedDocumentText(raw.replace(/\r\n/g, '\n'));
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const noKnownDrugAllergies =
    /\bNKDA\b/i.test(text) ||
    /\bno\s+known\s+(drug\s+)?allergies\b/i.test(text) ||
    /\bNKA\b/i.test(text);

  const allergySection = sliceAfterHeader(
    lines,
    /^(allergies|drug\s*allergies|adverse\s*drug\s*events)\b/i
  );
  const medSection = sliceAfterHeader(
    lines,
    /^(current\s*)?(medications?|medication\s*list|home\s*meds)\b/i
  );
  const chronicSection = sliceAfterHeader(
    lines,
    /^(chronic\s*conditions?|problem\s*list|active\s*problems|diagnoses)\b/i
  );

  const allergies = noKnownDrugAllergies ? [] : parseAllergyRows(allergySection, text);
  let allergyRows = allergies;
  if (!noKnownDrugAllergies && allergyRows.length === 0 && allergySection.length === 0) {
    const bulletLines = lines.filter((l) => /^[-•*]\s+\S{2,}/.test(l)).slice(0, 30);
    const fb = parseAllergyRows(bulletLines, text);
    if (fb.length) allergyRows = fb;
  }
  const medications = parseMedicationRows(medSection);
  const chronicConditions = parseChronicRows(chronicSection, text);

  return {
    patientFields: parsePatientFields(text),
    noKnownDrugAllergies,
    insurances: parseInsuranceFromText(text),
    allergies: allergyRows,
    medications,
    chronicConditions,
    hospitalVisit: parseHospital(text),
  };
}
