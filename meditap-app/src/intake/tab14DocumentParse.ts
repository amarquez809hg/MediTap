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

const SECTION_END =
  /^(insurance|allergies|medications?|medication\s*list|chronic|conditions?|problem\s*list|hospital|admission|visit\s*history|demographics|patient\s*information|vitals|results|procedures|immunizations|social\s*history|care\s*team)\b/i;

/** Athena / EHR "Data Portability" exports (table of contents + columnar sections). */
export function isAthenaPortabilityDocument(text: string): boolean {
  return (
    /data\s+portability\s+for\b/i.test(text) &&
    (/table\s+of\s+contents/i.test(text) || /demographics\s+sex\s+/i.test(text))
  );
}

function splitDoubleSpacedColumns(line: string): string[] {
  return line
    .trim()
    .split(/\s{2,}/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseAthenaPatientFields(text: string): Tab14PatientFields {
  const out: Tab14PatientFields = {};

  const title = text.match(
    /data\s+portability\s+for\s+([^\n]+?)(?:\s+table\s+of\s+contents|\n)/i
  );
  if (title) {
    const split = splitPersonName(title[1].trim());
    if (split.given) out.givenName = split.given;
    if (split.family) out.familyName = split.family;
  }

  const sexDob = text.match(
    /\bsex\s+(male|female)\b[^.\n]{0,80}?\bd\.?o\.?b\.?\s+(\d{1,2}\/\d{1,2}\/\d{4})/i
  );
  if (sexDob) {
    out.sexAtBirth =
      sexDob[1].charAt(0).toUpperCase() + sexDob[1].slice(1).toLowerCase();
    const iso = tryParseDateToIso(sexDob[2]);
    if (iso) out.dateOfBirth = iso;
  }

  const phoneEmail = text.match(
    /\bphone\s+(\(\d{3}\)\s*[\d-]+)\s+email\s+([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i
  );
  if (phoneEmail) {
    out.phoneNumber = phoneEmail[1].replace(/\s+/g, ' ').trim();
    out.email = phoneEmail[2];
  }

  const em = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  if (em && !out.email) out.email = em[0];

  const bt = normalizeBloodType(text);
  if (bt) out.bloodType = bt;

  return pickDefined(out as Record<string, string>);
}

const ALLERGY_REACTION_WORDS =
  'Rash|Hives|Congestion|Itching|Swelling|Nausea|Vomiting|Anaphylaxis|Shortness of breath|Diarrhea|Wheezing';

function parseAthenaAllergyPair(raw: string): Tab14AllergyRow | null {
  const cleaned = raw.split(/\s+medications\b/i)[0].trim();
  const reactionMatch = cleaned.match(
    new RegExp(`^(.+?)\\s+(?:${ALLERGY_REACTION_WORDS})\\s*$`, 'i')
  );
  let name: string;
  let reaction: string;
  if (reactionMatch) {
    name = reactionMatch[1].trim();
    reaction = cleaned.slice(name.length).trim();
  } else {
    const parts = splitDoubleSpacedColumns(cleaned);
    if (parts.length < 2) return null;
    name = parts[0].replace(/^(allergen|reaction)\s*/i, '').trim();
    reaction = parts.slice(1).join(' ').trim();
  }
  if (name.length < 2 || name.length > 120) return null;
  if (/^(allergen|reaction|none|n\/a)$/i.test(name)) return null;
  return {
    allergyName: name,
    allergyType: guessAllergyType(name),
    allergyTypeOther: '',
    severity: '',
    reactionNotes: reaction,
    lastObserved: '',
  };
}

function parseAthenaAllergies(text: string): Tab14AllergyRow[] {
  const rows: Tab14AllergyRow[] = [];
  const header = text.match(/allergies\s+allergen\s+reaction\s+([^\n]+)/i);
  if (header) {
    const first = parseAthenaAllergyPair(header[1]);
    if (first) rows.push(first);
  }

  const blockM = text.match(
    /allergies\s+allergen\s+reaction[\s\S]*?\n([\s\S]*?)(?=\n\s*medications\s+medication\s+instructions\b|\bmedications\s+medication\s+instructions\b)/i
  );
  const block = blockM ? blockM[1] : '';
  for (const line of block.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || /^(allergen|reaction)\b/i.test(trimmed)) continue;
    if (/^medications\b/i.test(trimmed)) break;
    const row = parseAthenaAllergyPair(trimmed);
    if (row && !rows.some((r) => r.allergyName === row.allergyName)) rows.push(row);
  }
  return rows;
}

function parseAthenaMedicationLine(line: string): Tab14MedicationRow | null {
  const trimmed = line.trim();
  if (!/\d+\s*mg\b/i.test(trimmed)) return null;
  const m = trimmed.match(
    /^([A-Za-z][A-Za-z0-9\s\-/]*?)\s+(\d+(?:\.\d+)?\s*mg)\s+(.+)$/i
  );
  if (!m) return null;
  const notes = m[3].trim();
  const freqM = notes.match(
    /\b(once\s+daily|twice\s+daily|three\s+times\s+daily|daily|as\s+needed|at\s+onset\s+of\s+migraine|before\s+breakfast)\b/i
  );
  return {
    genericName: collapseWs(m[1]),
    brandName: '',
    dosage: m[2].trim(),
    route: '',
    frequency: freqM ? freqM[1] : '',
    startDate: '',
    endDate: '',
    purpose: '',
    prescribingPhysician: '',
    notesMedication: notes,
  };
}

function parseAthenaMedications(text: string): Tab14MedicationRow[] {
  const rows: Tab14MedicationRow[] = [];
  let inSection = false;

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (/medications\s+medication\s+instructions/i.test(trimmed)) {
      inSection = true;
      const rest = trimmed.replace(/^.*medication\s+instructions\s*/i, '').trim();
      if (rest) {
        const row = parseAthenaMedicationLine(rest);
        if (row) rows.push(row);
      }
      continue;
    }
    if (!inSection) continue;
    if (/^\s*vitals\b/i.test(trimmed)) break;
    if (/^\s*social\s+history\b/i.test(trimmed)) break;
    const row = parseAthenaMedicationLine(trimmed);
    if (row) rows.push(row);
  }
  return rows;
}

function parseAthenaProblemLine(line: string): Tab14ChronicRow | null {
  const trimmed = line.split(/\s+procedures\b/i)[0].trim();
  if (!trimmed || /^(condition|status)\b/i.test(trimmed)) return null;
  const m =
    trimmed.match(/^(.+?)\s{2,}(Active|Controlled|Resolved|Inactive)\s*$/i) ||
    trimmed.match(/^(.+?)\s+(Active|Controlled|Resolved|Inactive)\s*$/i);
  if (!m) return null;
  const name = m[1].trim();
  if (name.length < 3) return null;
  return {
    conditionName: name.slice(0, 200),
    icdCode: '',
    diagnosisDate: '',
    severity: '',
    prexisting: /^active$/i.test(m[2]) ? 'Yes' : '',
    notesChronicConditions: `Status: ${m[2]}`,
  };
}

function parseAthenaChronicConditions(text: string): Tab14ChronicRow[] {
  const rows: Tab14ChronicRow[] = [];
  let inSection = false;

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (/problems\s+condition\s+status/i.test(trimmed)) {
      inSection = true;
      const rest = trimmed.replace(/^.*status\s+/i, '').trim();
      if (rest) {
        const row = parseAthenaProblemLine(rest);
        if (row) rows.push(row);
      }
      continue;
    }
    if (!inSection) continue;
    if (/procedures\s+date\s+procedure/i.test(trimmed)) break;
    if (/^\d{1,2}\/\d{1,2}\/\d{4}\s+\S+\s+Completed/i.test(trimmed)) break;
    const row = parseAthenaProblemLine(trimmed);
    if (row) rows.push(row);
  }
  return rows;
}

function parseAthenaHospital(text: string): Tab14HospitalFields {
  const out: Tab14HospitalFields = {};

  const careTeam = text.match(
    /primary\s+care\s+physician\s+((?:Dr\.?\s+)?[A-Za-z][^,\n]+(?:,\s*MD)?)\s{2,}([^\n]+)/i
  );
  if (careTeam) {
    out.attendingPhysician = collapseWs(careTeam[1]).slice(0, 120);
    out.facilityName = collapseWs(careTeam[2]).slice(0, 200);
  }

  const encounters = [
    ...text.matchAll(
      /(\d{1,2}\/\d{1,2}\/\d{4})\s*[–—-]\s*([^\n]+?)(?=\s+\d{1,2}\/\d{1,2}\/\d{4}\s*[–—-]|$)/g
    ),
  ];
  if (encounters.length) {
    const latest = encounters[encounters.length - 1];
    const iso = tryParseDateToIso(latest[1]);
    if (iso) out.visitDate = iso;
    const reason = latest[2].trim();
    out.reason = reason.slice(0, 300);
    if (/wellness|annual\s+physical/i.test(reason)) out.visitType = 'Annual wellness';
    else if (/follow-?up/i.test(reason)) out.visitType = 'Follow-up';
    else out.visitType = 'Outpatient visit';
  }

  return pickDefined(out as Record<string, string>);
}

function parseAthenaPortabilityDocument(text: string): Tab14IntakeParseResult {
  return {
    patientFields: parseAthenaPatientFields(text),
    noKnownDrugAllergies: false,
    insurances: [],
    allergies: parseAthenaAllergies(text),
    medications: parseAthenaMedications(text),
    chronicConditions: parseAthenaChronicConditions(text),
    hospitalVisit: parseAthenaHospital(text),
  };
}

function isPlausibleMedicationLine(line: string): boolean {
  const raw = line.trim();
  if (raw.length < 3) return false;
  if (/^(vitals|results|observation|created\s+date|glucose|cholesterol|triglycerides|social\s+history)\b/i.test(raw)) {
    return false;
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}\s/.test(raw) && !/\d+\s*mg\b/i.test(raw)) return false;
  if (/\bmg\/dL\b/i.test(raw) || /\bcompleted\b/i.test(raw) && /\bnormal\b/i.test(raw)) return false;
  return (
    /\d+\s*mg\b/i.test(raw) ||
    (/^(?:medication|drug|rx)\s*[:#]/i.test(raw) && raw.length > 8)
  );
}

function mergeTab14ParseResults(
  primary: Tab14IntakeParseResult,
  fallback: Tab14IntakeParseResult
): Tab14IntakeParseResult {
  const patientFields = {
    ...fallback.patientFields,
    ...primary.patientFields,
  };

  const medications =
    primary.medications.length > 0
      ? primary.medications
      : fallback.medications.filter((_, i, arr) => {
          const line = arr[i]?.genericName ?? '';
          return isPlausibleMedicationLine(line);
        });

  return {
    patientFields,
    noKnownDrugAllergies: primary.noKnownDrugAllergies || fallback.noKnownDrugAllergies,
    insurances: primary.insurances.length ? primary.insurances : fallback.insurances,
    allergies: primary.allergies.length ? primary.allergies : fallback.allergies,
    medications,
    chronicConditions: primary.chronicConditions.length
      ? primary.chronicConditions
      : fallback.chronicConditions,
    hospitalVisit: {
      ...fallback.hospitalVisit,
      ...primary.hospitalVisit,
    },
  };
}

function sliceAfterHeader(lines: string[], headerRe: RegExp): string[] {
  let idx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (headerRe.test(lines[i])) idx = i;
  }
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
    if (!isPlausibleMedicationLine(raw)) continue;
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
    /(?:attending|provider)\s*[:#]?\s*((?:Dr\.?\s+)?[A-Za-z][^,\n]{2,60}(?:,\s*MD)?)/i,
  ]);
  if (att) out.attendingPhysician = att.trim().slice(0, 120);
  if (!out.attendingPhysician) {
    const drOnly = text.match(/\b(Dr\.?\s+[A-Za-z][A-Za-z\s.'-]{1,40},\s*MD)\b/);
    if (drOnly) out.attendingPhysician = drOnly[1].trim();
  }

  const vt = labelValue(text, [/visit\s*type\s*[:#]?\s*([^\n]+)/i]);
  if (vt) out.visitType = vt.trim().slice(0, 120);

  const rid = labelValue(text, [/report\s*id\s*[:#]?\s*([A-Z0-9-]+)/i]);
  if (rid) out.reportId = rid.trim();

  return pickDefined(out as Record<string, string>);
}

function parseGenericTab14Document(text: string): Tab14IntakeParseResult {
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

/**
 * Parse free-text (from PDF text layer or OCR) into Tab14-shaped structures.
 */
export function parseTab14IntakeDocument(raw: string): Tab14IntakeParseResult {
  const rawText = raw.replace(/\r\n/g, '\n');
  const text = normalizeExtractedDocumentText(rawText);
  const generic = parseGenericTab14Document(text);
  if (!isAthenaPortabilityDocument(rawText) && !isAthenaPortabilityDocument(text)) {
    return generic;
  }
  // Athena exports use multi-space columns; parse before normalize collapses spacing.
  const athena = parseAthenaPortabilityDocument(rawText);
  return mergeTab14ParseResults(athena, generic);
}
