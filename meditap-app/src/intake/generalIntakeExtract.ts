/**
 * Format-agnostic Tab14 intake extraction.
 * Scans documents for known clinical labels, validates values, and maps sections —
 * works across colon forms, space-column exports, EHR portability dumps, and narrative PDFs.
 */

import { tryParseDateToIso } from './intakeDateParse';
import {
  collapseWs,
  DEMOGRAPHIC_LABELS,
  DEMOGRAPHICS_END,
  escapeRe,
  INTAKE_SECTION_HEADERS,
  isPlaceholderValue,
  labelMatchRegex,
  looksLikeBirthDate,
  looksLikePersonName,
  normalizeBloodType,
  splitPersonName,
  validateDemographicValue,
  type DemographicFieldKey,
} from './intakeFieldLabels';
import type {
  Tab14AllergyRow,
  Tab14ChronicRow,
  Tab14HospitalFields,
  Tab14InsuranceRow,
  Tab14IntakeParseResult,
  Tab14MedicationRow,
  Tab14PatientFields,
} from './tab14IntakeTypes';

type LabelHit = {
  field: DemographicFieldKey | '_boundary';
  alias: string;
  index: number;
  valueStart: number;
};

const BOUNDARY_SCAN_ALIASES = [
  'Interpreter Needed',
  'MRN',
  'Guardian',
  'School',
  'Insurance',
  'GROWTH DATA',
  'PROBLEMS',
  'DIAGNOSIS',
  'MEDICATIONS',
  'ALLERGIES',
  'Phone',
  'Blood Type',
  'DOB',
  'Sex',
  'Address',
  'Email',
];

/** Insert line breaks before section headers and common labels when PDF text is glued. */
export function preprocessIntakeDocumentText(text: string): string {
  let t = text.replace(/\r\n/g, '\n');

  const breakTokens = [
    ...INTAKE_SECTION_HEADERS,
    ...DEMOGRAPHIC_LABELS.flatMap((d) => d.aliases).filter((a) => !/^name$/i.test(a)),
    'Allergen:',
    'Reaction:',
    'Provider Name:',
    'Policy Number:',
    'Member ID:',
    'Group Number:',
    'Generic Name:',
    'Condition Name:',
    'Chief Complaint:',
    'Date:',
    'Facility:',
    'Interpreter Needed',
    'MRN',
    'Guardian',
    'School',
    'Insurance',
  ];

  for (const token of [...new Set(breakTokens)].sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`\\s+(${escapeRe(token)})(?=\\s|:|$)`, 'gi');
    t = t.replace(re, `\n$1`);
  }

  t = t.replace(/(ENCOUNTER NOTE \d+)(Date:)/gi, '$1\n$2');
  return t.replace(/\n{3,}/g, '\n\n');
}

function extractDemographicsScope(text: string): string {
  const scoped =
    text.match(
      new RegExp(`\\bPATIENT DEMOGRAPHICS\\s+(.+?)(?=${DEMOGRAPHICS_END}|$)`, 'is')
    )?.[1] ??
    text.match(
      new RegExp(`\\bDEMOGRAPHICS\\s+(.+?)(?=${DEMOGRAPHICS_END}|$)`, 'is')
    )?.[1] ??
    text.match(new RegExp(`^(.{0,1200}?)(?=${DEMOGRAPHICS_END})`, 'is'))?.[1];

  return scoped?.trim() ?? text.slice(0, 1200);
}

function collectLabelHits(scope: string): LabelHit[] {
  const hits: LabelHit[] = [];

  for (const def of DEMOGRAPHIC_LABELS) {
    for (const alias of def.aliases) {
      const re = labelMatchRegex(alias);
      for (const m of scope.matchAll(re)) {
        if (m.index === undefined) continue;
        hits.push({
          field: def.field,
          alias,
          index: m.index,
          valueStart: m.index + m[0].length,
        });
      }
    }
  }

  for (const alias of BOUNDARY_SCAN_ALIASES) {
    if (DEMOGRAPHIC_LABELS.some((d) => d.aliases.some((a) => a.toLowerCase() === alias.toLowerCase()))) {
      continue;
    }
    const re = labelMatchRegex(alias);
    for (const m of scope.matchAll(re)) {
      if (m.index === undefined) continue;
      hits.push({
        field: '_boundary',
        alias,
        index: m.index,
        valueStart: m.index + m[0].length,
      });
    }
  }

  const deduped: LabelHit[] = [];
  for (const hit of hits) {
    const overlap = deduped.find(
      (d) => Math.abs(d.index - hit.index) <= 2 || Math.abs(d.valueStart - hit.valueStart) <= 2
    );
    if (!overlap) deduped.push(hit);
    else if (hit.alias.length > overlap.alias.length) {
      const idx = deduped.indexOf(overlap);
      deduped[idx] = hit;
    }
  }

  return deduped.sort((a, b) => a.index - b.index);
}

function readValueBetween(scope: string, start: number, end: number): string {
  return collapseWs(scope.slice(start, end));
}

function extractTitleName(text: string): Tab14PatientFields {
  const out: Tab14PatientFields = {};

  const portability = text.match(
    /data\s+portability\s+for\s+([^\n]+?)(?:\s+table\s+of\s+contents|\n)/i
  );
  if (portability) {
    const split = splitPersonName(portability[1].trim());
    if (split.given && looksLikePersonName(split.given)) out.givenName = split.given;
    if (split.family && looksLikePersonName(split.family)) out.familyName = split.family;
  }

  const recordTitle = text.match(
    /\bPage\s+\d+\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\s+[-–—]\s+/i
  );
  if (recordTitle && !out.givenName) {
    const split = splitPersonName(recordTitle[1]);
    if (split.given && looksLikePersonName(split.given)) out.givenName = split.given;
    if (split.family && looksLikePersonName(split.family)) out.familyName = split.family;
  }

  return out;
}

function extractAthenaDemographicsLine(text: string): Tab14PatientFields {
  const out: Tab14PatientFields = {};
  const sexDob = text.match(
    /\bsex\s+(male|female)\b[^.\n]{0,80}?\bd\.?o\.?b\.?\s+(\d{1,2}\/\d{1,2}\/\d{4})/i
  );
  if (sexDob) {
    out.sexAtBirth =
      sexDob[1].charAt(0).toUpperCase() + sexDob[1].slice(1).toLowerCase();
    const iso = tryParseDateToIso(sexDob[2]);
    if (iso && looksLikeBirthDate(iso)) out.dateOfBirth = iso;
  }

  const phoneEmail = text.match(
    /\bphone\s+(\(\d{3}\)\s*[\d-]+)\s+email\s+([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i
  );
  if (phoneEmail) {
    out.phoneNumber = phoneEmail[1].replace(/\s+/g, ' ').trim();
    out.email = phoneEmail[2];
  }

  const bt = normalizeBloodType(text);
  if (bt) out.bloodType = bt;

  return out;
}

function extractPatientFieldsFromLabels(text: string): Tab14PatientFields {
  const scope = extractDemographicsScope(text);
  const hits = collectLabelHits(scope);
  const rawByField = new Map<DemographicFieldKey, string>();

  for (let i = 0; i < hits.length; i++) {
    const end = i + 1 < hits.length ? hits[i + 1].index : scope.length;
    const raw = readValueBetween(scope, hits[i].valueStart, end);
    if (!raw || isPlaceholderValue(raw)) continue;
    if (hits[i].field === '_boundary') continue;
    const field = hits[i].field as DemographicFieldKey;
    if (!rawByField.has(field)) rawByField.set(field, raw);
  }

  const out: Tab14PatientFields = {};

  const givenRaw = rawByField.get('givenName');
  const familyRaw = rawByField.get('familyName');
  const fullRaw = rawByField.get('fullName');

  if (givenRaw) {
    const v = validateDemographicValue('givenName', givenRaw);
    if (v) out.givenName = v;
  }
  if (familyRaw) {
    const v = validateDemographicValue('familyName', familyRaw);
    if (v) out.familyName = v;
  }
  if (fullRaw) {
    const v = validateDemographicValue('fullName', fullRaw);
    if (v) {
      const split = splitPersonName(v);
      if (!out.givenName && split.given && looksLikePersonName(split.given)) {
        out.givenName = split.given;
      }
      if (!out.familyName && split.family && looksLikePersonName(split.family)) {
        out.familyName = split.family;
      }
    }
  }

  const dobRaw = rawByField.get('dateOfBirth');
  if (dobRaw) {
    const iso = tryParseDateToIso(dobRaw) ?? tryParseDateToIso(dobRaw.split(/\s+/)[0] ?? '');
    if (iso && looksLikeBirthDate(iso)) out.dateOfBirth = iso;
  }
  if (!out.dateOfBirth) {
    const dobInline = text.match(
      /\b(?:DOB|Date of Birth)\s*[:#]?\s*(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/i
    );
    if (dobInline) {
      const iso = tryParseDateToIso(dobInline[1]);
      if (iso && looksLikeBirthDate(iso)) out.dateOfBirth = iso;
    }
  }

  for (const key of [
    'sexAtBirth',
    'bloodType',
    'email',
    'phoneNumber',
    'address',
    'race',
    'ethnicity',
    'preferredLanguage',
    'maritalStatus',
    'heightInches',
    'weightLbs',
  ] as const) {
    const raw = rawByField.get(key);
    if (!raw) continue;
    if (key === 'bloodType') {
      const v = normalizeBloodType(raw);
      if (v) out.bloodType = v;
      continue;
    }
    if (key === 'preferredLanguage') {
      const v = validateDemographicValue(key, raw.split(/\s+(?=Interpreter Needed\b)/i)[0] ?? raw);
      if (v) out.preferredLanguage = v;
      continue;
    }
    const v = validateDemographicValue(key, raw);
    if (v) out[key] = v;
  }

  return out;
}

function mergePatientFields(...parts: Tab14PatientFields[]): Tab14PatientFields {
  const out: Tab14PatientFields = {};
  for (const p of parts) {
    for (const [k, v] of Object.entries(p) as [keyof Tab14PatientFields, string][]) {
      if (typeof v === 'string' && v.trim() && !out[k]) out[k] = v.trim();
    }
  }
  return out;
}

function sliceSection(text: string, header: RegExp, until: RegExp): string {
  const m = text.match(new RegExp(`${header.source}\\s*(.+?)(?=${until.source}|$)`, 'is'));
  return m?.[1]?.trim() ?? '';
}

const SECTION_END =
  /^(insurance|allergies|medications?|medication\s*list|chronic|conditions?|problem\s*list|hospital|admission|visit\s*history|demographics|patient\s*information|vitals|results|procedures|immunizations|social\s*history|care\s*team|missing\s*fields|encounter\s*note|diagnosis|pathology|urgent\s*care|dental|imaging)\b/i;

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
    if (l.length > 220) break;
    out.push(l);
    if (out.length > 80) break;
  }
  return out;
}

function guessAllergyType(name: string): string {
  const n = name.toLowerCase();
  if (/\b(penicillin|aspirin|ibuprofen|drug|medication|sulfa|insulin)\b/.test(n)) return 'Drug';
  if (/\b(peanut|milk|egg|shellfish|soy|wheat|food)\b/.test(n)) return 'Food';
  if (/\b(pollen|dust|latex|mold|cat|dog|environmental|seasonal)\b/.test(n)) return 'Environmental';
  return '';
}

const ALLERGY_REACTION_WORDS =
  'Rash|Hives|Congestion|Itching|Swelling|Nausea|Vomiting|Anaphylaxis|Shortness of breath|Diarrhea|Wheezing';

function parseAllergyRows(sectionLines: string[], fullText: string): Tab14AllergyRow[] {
  if (/\bNKDA\b/i.test(fullText) || /no\s+known\s+(drug\s+)?allergies/i.test(fullText)) {
    return [];
  }
  const rows: Tab14AllergyRow[] = [];
  const bullet = /^[-•*]\s*(.+)$/;
  const numbered = /^\d+[.)]\s*(.+)$/;

  for (const line of sectionLines) {
    const m = line.match(bullet) || line.match(numbered);
    const body = m ? m[1] : line.includes('—') || line.includes('-') ? line : '';
    if (!body) continue;
    const parts = body.split(/[—–-]\s*/).map((s) => s.trim());
    const name = parts[0].replace(/^(allergy|allergic to)\s*:?\s*/i, '').trim();
    if (name.length < 2 || name.length > 120) continue;
    if (/^(none|n\/a|see below)\b/i.test(name)) continue;
    rows.push({
      allergyName: name,
      allergyType: guessAllergyType(name),
      allergyTypeOther: '',
      severity: '',
      reactionNotes: parts.slice(1).join(' — '),
      lastObserved: '',
    });
  }

  if (rows.length === 0 && /seasonal allergies/i.test(fullText)) {
    rows.push({
      allergyName: 'Seasonal allergies',
      allergyType: 'Environmental',
      allergyTypeOther: '',
      severity: '',
      reactionNotes: '',
      lastObserved: '',
    });
  }

  return rows;
}

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
    const parts = cleaned.split(/\s{2,}/).map((s) => s.trim()).filter(Boolean);
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

function isPlausibleMedicationLine(line: string): boolean {
  const raw = line.trim();
  if (raw.length < 3) return false;
  if (/^(vitals|results|observation|created\s+date|glucose|cholesterol|triglycerides|social\s+history)\b/i.test(raw)) {
    return false;
  }
  if (/^\d{1,2}\/\d{1,2}\/\d{4}\s/.test(raw) && !/\d+\s*mg\b/i.test(raw)) return false;
  if (/\bmg\/dL\b/i.test(raw)) return false;
  return (
    /\d+\s*mg\b/i.test(raw) ||
    (/^(?:medication|drug|rx|nitrofurantoin|carvedilol|entresto|aspirin|lisinopril|omeprazole|cetirizine|sumatriptan)\b/i.test(raw) &&
      raw.length > 8)
  );
}

function parseMedicationLine(raw: string): Tab14MedicationRow | null {
  const line = raw.trim();
  if (!isPlausibleMedicationLine(line)) return null;
  const dose = line.match(/\b(\d+(?:\.\d+)?(?:\s*\/\s*\d+)?\s*(?:mg|mcg|g|units?))\b/i);
  const freq = line.match(
    /\b(once\s+daily|twice\s+daily|three\s+times\s+daily|BID|TID|QID|daily|q\.?d\.?|b\.?i\.?d\.?|prn|weekly|as\s+needed|before\s+breakfast|at\s+onset\s+of\s+migraine)\b/i
  );
  const routeM = line.match(/\b(PO|ORAL|IV|IM|SUBQ|TOPICAL|INHALATION)\b/i);
  let generic = dose ? line.slice(0, line.indexOf(dose[0])).trim() : line;
  generic = generic.replace(/^[-•*\d.)]+\s*/, '').replace(/\s*\([^)]+\)\s*$/, '').trim();
  if (generic.length < 2) return null;
  const brandM = line.match(/\(([^)]+)\)/);
  return {
    genericName: generic.split(/\s+/).slice(0, 4).join(' '),
    brandName: brandM ? brandM[1].trim() : '',
    dosage: dose?.[1]?.trim() ?? '',
    route: routeM ? routeM[1].charAt(0).toUpperCase() + routeM[1].slice(1).toLowerCase() : '',
    frequency: freq?.[1] ?? '',
    startDate: '',
    endDate: '',
    purpose: '',
    prescribingPhysician: '',
    notesMedication: '',
  };
}

function parseMedicationRows(sectionLines: string[]): Tab14MedicationRow[] {
  const rows: Tab14MedicationRow[] = [];
  for (const line of sectionLines) {
    const row = parseMedicationLine(line);
    if (row) rows.push(row);
  }
  return rows;
}

function parseAthenaMedicationLine(line: string): Tab14MedicationRow | null {
  const trimmed = line.trim();
  if (!/\d+\s*mg\b/i.test(trimmed)) return null;
  const m = trimmed.match(/^([A-Za-z][A-Za-z0-9\s\-/]*?)\s+(\d+(?:\.\d+)?\s*mg)\s+(.+)$/i);
  if (!m) return parseMedicationLine(trimmed);
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
    const row = parseAthenaMedicationLine(trimmed);
    if (row) rows.push(row);
  }
  return rows;
}

const ICD_RE = /\b([A-TV-Z]\d{2}(?:\.\d+)?[A-Z0-9]{0,4})\b/;

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
    if (/^(stage|grade|specimen|cycle|regimen|margins|sentinel|date|height|weight|bmi|percentile)/i.test(s)) {
      continue;
    }
    if (/^(group\s*#|provider|policy|member\s*id|shellfish|sulfa|medications|allergies|coverage)/i.test(s)) {
      continue;
    }
    if (/\bmedications[a-z]/i.test(s) || (/\bdiagnosed\s+\d/i.test(s) && s.length > 80)) {
      continue;
    }
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
    const row = parseAthenaProblemLine(trimmed);
    if (row) rows.push(row);
  }
  return rows;
}

function parseHospital(text: string): Tab14HospitalFields {
  const out: Tab14HospitalFields = {};

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
    return {
      visitDate: latest[1],
      facilityName: collapseWs(latest[2]),
      visitType: 'Follow-up',
      reason: 'Follow-up and review of active problems',
    };
  }

  const encounterIso = text.match(
    /ENCOUNTER NOTE\s+\d+\s*\n?\s*Date:\s*(\d{4}-\d{2}-\d{2})/i
  );
  if (encounterIso) {
    const fac = text.match(
      new RegExp(
        `ENCOUNTER NOTE\\s+\\d+\\s*\\n?\\s*Date:\\s*${escapeRe(encounterIso[1])}\\s+Facility:\\s*([^\\n]+)`,
        'i'
      )
    );
    return {
      visitDate: encounterIso[1],
      facilityName: fac ? collapseWs(fac[1]) : '',
      visitType: 'Follow-up',
      reason: 'Follow-up and review of active problems',
    };
  }

  const careTeam = text.match(
    /primary\s+care\s+physician\s+((?:Dr\.?\s+)?[A-Za-z][^,\n]+(?:,\s*MD)?)\s{2,}([^\n]+)/i
  );
  if (careTeam) {
    out.attendingPhysician = collapseWs(careTeam[1]).slice(0, 120);
    out.facilityName = collapseWs(careTeam[2]).slice(0, 200);
  }

  const fac = text.match(/(?:^|\n)\s*Facility:\s*([^\n]+)/i);
  if (fac && !out.facilityName) out.facilityName = collapseWs(fac[1]).slice(0, 200);

  const reason = text.match(/(?:^|\n)\s*Reason:\s*([^\n]+)/i);
  if (reason) out.reason = collapseWs(reason[1]).slice(0, 300);

  const admit = text.match(/(?:admission|admit|visit)\s*date\s*[:#]?\s*([^\n]+)/i);
  if (admit) {
    const iso = tryParseDateToIso(admit[1]);
    if (iso) out.visitDate = iso;
  }

  const encounters2 = [
    ...text.matchAll(
      /(\d{1,2}\/\d{1,2}\/\d{4})\s*[–—-]\s*([^\n]+?)(?=\s+\d{1,2}\/\d{1,2}\/\d{4}\s*[–—-]|$)/g
    ),
  ];
  if (encounters2.length && !out.visitDate) {
    const latest = encounters2[encounters2.length - 1];
    const iso = tryParseDateToIso(latest[1]);
    if (iso) out.visitDate = iso;
    out.reason = latest[2].trim().slice(0, 300);
    if (/wellness|annual\s+physical/i.test(latest[2])) out.visitType = 'Annual wellness';
    else if (/follow-?up/i.test(latest[2])) out.visitType = 'Follow-up';
    else out.visitType = 'Outpatient visit';
  }

  return out;
}

function parseInsuranceFromText(text: string): Tab14InsuranceRow[] {
  const one: Tab14InsuranceRow = {
    providerName: '',
    policyNumber: '',
    planName: '',
    memberID: '',
    groupNumber: '',
    startDate: '',
    endDate: '',
  };

  const label = (re: RegExp) => text.match(re)?.[1]?.trim();
  const payer =
    label(/(?:payer|insurance|carrier|provider)\s*name\s*[:#]?\s*([^\n]+)/i) ||
    text.match(/\b(Blue\s+Cross|UnitedHealthcare|Aetna|Cigna|Humana|Medicare|Medicaid|Kaiser|UHC|BCBS)\b/i)?.[0];
  if (payer) one.providerName = payer.replace(/\s*\(.*$/, '').trim();
  one.planName = label(/plan\s*name\s*[:#]?\s*([^\n]+)/i) ?? '';
  one.memberID =
    label(/member\s*(?:id|#|number)?\s*[:#]?\s*([A-Z0-9\-]{4,})/i) ??
    text.match(/\b(?:subscriber|member)\s*id\s*[:#]?\s*([A-Z0-9\-]{4,})/i)?.[1] ??
    '';
  one.groupNumber = label(/group\s*(?:number|#|id)?\s*[:#]?\s*([A-Z0-9\-]{2,})/i) ?? '';
  one.policyNumber = label(/policy\s*(?:number|#|id)?\s*[:#]?\s*([A-Z0-9\-]{4,})/i) ?? '';
  const eff = label(/(?:effective|start)\s*date\s*[:#]?\s*([^\n]+)/i);
  if (eff) {
    const iso = tryParseDateToIso(eff);
    if (iso) one.startDate = iso;
  }
  const exp = label(/(?:expir|end)\s*date\s*[:#]?\s*([^\n]+)/i);
  if (exp) {
    const iso = tryParseDateToIso(exp);
    if (iso) one.endDate = iso;
  }

  if (one.providerName || one.memberID || one.groupNumber || one.policyNumber || one.planName) {
    return [one];
  }
  return [];
}

function pickDefinedPatient(obj: Tab14PatientFields): Tab14PatientFields {
  const out: Tab14PatientFields = {};
  for (const [k, v] of Object.entries(obj) as [keyof Tab14PatientFields, string | undefined][]) {
    if (typeof v === 'string' && v.trim()) out[k] = v.trim();
  }
  return out;
}

/**
 * Primary format-agnostic intake parser.
 */
export function parseGeneralIntakeDocument(raw: string): Tab14IntakeParseResult {
  const text = preprocessIntakeDocumentText(raw);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  const patientFields = pickDefinedPatient(
    mergePatientFields(
      extractPatientFieldsFromLabels(text),
      extractTitleName(text),
      extractAthenaDemographicsLine(text)
    )
  );

  const noKnownDrugAllergies =
    /\bNKDA\b/i.test(text) ||
    /\bno\s+known\s+(drug\s+)?allergies\b/i.test(text) ||
    /\bNKA\b/i.test(text);

  const allergySection = sliceAfterHeader(lines, /^(allergies|drug\s*allergies|alergias)\b/i);
  let allergies = noKnownDrugAllergies ? [] : parseAllergyRows(allergySection, text);
  if (!allergies.length) allergies = parseAthenaAllergies(text);

  const medSection =
    sliceAfterHeader(lines, /^(current\s*)?(medications?|medication\s*list|home\s*meds|medicamentos)\b/i) ||
    sliceSection(text, /\bMEDICATIONS\b/i, /MISSING FIELDS|ENCOUNTER NOTE|URGENT CARE|ALLERGIES/i).split('\n');
  let medications = parseMedicationRows(Array.isArray(medSection) ? medSection : [medSection]);
  if (!medications.length) medications = parseAthenaMedications(text);
  if (!medications.length) {
    const urgent = sliceSection(text, /URGENT CARE\b/i, /DENTAL NOTE|IMAGING|OUTSIDE/i);
    medications = parseMedicationRows(urgent.split('\n').filter(Boolean));
  }
  if (!medications.length && /List A:/i.test(text)) {
    const listA = text.match(/List A:\s*([^.]+)/i)?.[1];
    if (listA) medications = parseMedicationRows([listA]);
  }

  const diagnosis = sliceSection(
    text,
    /\bDIAGNOSIS\b/i,
    /PATHOLOGY|CHEMOTHERAPY|LABS|MISSING|ENCOUNTER/i
  );
  const problems = sliceSection(
    text,
    /\bPROBLEMS\b/i,
    /MISSING FIELDS|ENCOUNTER NOTE|DIAGNOSIS/i
  );
  let chronicConditions = parseChronicFromNarrative(diagnosis);
  if (!chronicConditions.length) chronicConditions = parseChronicFromNarrative(problems);
  if (!chronicConditions.length) {
    chronicConditions = parseChronicRows(
      sliceAfterHeader(lines, /^(chronic\s*conditions?|problem\s*list|active\s*problems|diagnoses)\b/i),
      text
    );
  }
  if (!chronicConditions.length) chronicConditions = parseAthenaChronicConditions(text);

  return {
    patientFields,
    noKnownDrugAllergies,
    insurances: parseInsuranceFromText(text),
    allergies,
    medications,
    chronicConditions,
    hospitalVisit: parseHospital(text),
  };
}

/** Score chronic rows so merge prefers clean parser output over noisy narrative fallbacks. */
export function chronicConditionParseScore(rows: Tab14ChronicRow[]): number {
  if (!rows.length) return -1;
  let score = 0;
  for (const row of rows) {
    const name = row.conditionName.trim();
    if (name.length < 3 || name.length > 100) {
      score -= 4;
      continue;
    }
    if (/^(group\s*#|provider|policy|shellfish|sulfa|medications|allergies|coverage)/i.test(name)) {
      score -= 6;
      continue;
    }
    if (/\bmedications[a-z]/i.test(name) || (/\bdiagnosed\s+\d/i.test(name) && name.length > 60)) {
      score -= 5;
      continue;
    }
    score += 2;
    if (row.icdCode && /^[A-Z]\d/i.test(row.icdCode)) score += 3;
    if (row.diagnosisDate) score += 1;
  }
  return score;
}

/** Merge multiple parse results — prefer validated, non-empty values; longer lists win. */
export function mergeIntakeParseResults(
  ...results: Tab14IntakeParseResult[]
): Tab14IntakeParseResult {
  const patientFields: Tab14PatientFields = {};
  const hospitalVisit: Tab14HospitalFields = {};

  for (const r of results) {
    for (const [k, v] of Object.entries(r.patientFields) as [keyof Tab14PatientFields, string][]) {
      if (v?.trim()) patientFields[k] = v.trim();
    }
    for (const [k, v] of Object.entries(r.hospitalVisit) as [keyof Tab14HospitalFields, string][]) {
      if (v?.trim()) hospitalVisit[k] = v.trim();
    }
  }

  const pickLongest = <T>(lists: T[][]): T[] => {
    const sorted = [...lists].sort((a, b) => b.length - a.length);
    return sorted[0]?.length ? sorted[0] : [];
  };

  const mergeInsurance = (): Tab14InsuranceRow[] => {
    const template: Tab14InsuranceRow = {
      providerName: '',
      policyNumber: '',
      planName: '',
      memberID: '',
      groupNumber: '',
      startDate: '',
      endDate: '',
    };
    const merged = { ...template };
    for (const r of results) {
      for (const row of r.insurances) {
        for (const key of Object.keys(template) as (keyof Tab14InsuranceRow)[]) {
          const v = row[key]?.trim();
          if (v && !merged[key]) merged[key] = v;
        }
      }
    }
    return Object.values(merged).some((v) => v.trim()) ? [merged] : [];
  };

  const specialized = results.slice(1);
  const generalOnly = results[0];

  const pickBestList = <T>(pick: (r: Tab14IntakeParseResult) => T[]): T[] => {
    const fromSpecialized = pickLongest(specialized.map(pick));
    if (fromSpecialized.length > 0) return fromSpecialized;
    return pick(generalOnly);
  };

  const pickBestChronic = (): Tab14ChronicRow[] => {
    let best: Tab14ChronicRow[] = [];
    let bestScore = -1;
    for (const r of results) {
      const rows = r.chronicConditions;
      const score = chronicConditionParseScore(rows);
      if (score > bestScore) {
        bestScore = score;
        best = rows;
      }
    }
    return bestScore >= 0 ? best : [];
  };

  const allergies = pickBestList((r) => r.allergies);
  const medications = pickBestList((r) => r.medications);
  const chronicConditions = pickBestChronic();
  const insurances = mergeInsurance();

  return {
    patientFields,
    noKnownDrugAllergies: allergies.length === 0 && results.some((r) => r.noKnownDrugAllergies),
    insurances,
    allergies,
    medications,
    chronicConditions,
    hospitalVisit,
  };
}
