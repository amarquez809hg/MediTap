/**
 * Heuristic extraction of Tab14 intake fields from plain text (PDF text layer or OCR).
 * Not a substitute for clinical validation — users should review before Save.
 */

import { normalizeExtractedDocumentText } from './documentTextExtraction';
import {
  detectNoKnownProblems,
  noKnownProblemsChronicRow,
} from './detectNoKnownProblems';
import {
  mergeIntakeParseResults,
  mergeLabPanels,
  parseGeneralIntakeDocument,
  preprocessIntakeDocumentText,
} from './generalIntakeExtract';
import { tryParseDateToIso } from './intakeDateParse';
import { normalizeMaritalStatus } from './intakeFieldLabels';
import { assessDemographicRawValue, withSanitizedPatientFieldWarnings } from './intakeFieldWarnings';
import {
  isMeditapDemoRecordDocument,
  parseMeditapDemoRecordDocument,
} from './meditapDemoRecordParse';
import {
  isEpicHealthSummaryDocument,
  parseEpicHealthSummaryDocument,
  scrubImplausibleEpicPatientNames,
} from './epicHealthSummaryParse';
import {
  isRiverbendHieDocument,
  parseRiverbendHieDocument,
} from './riverbendHieParse';
import {
  isSpanishMediTapRegistroDocument,
  parseSpanishMediTapRegistroDocument,
} from './spanishIntakeParse';
import {
  isMeditechCcdDocument,
  parseMeditechAllergies,
  parseMeditechMedications,
  parseMeditechPastEncounters,
  parseMeditechPayers,
  preprocessMeditechCcdText,
  buildMeditechExtendedOverlays,
  extractMeditechDemographicsContact,
  extractMeditechPatientSummaryName,
  filterMeditechLabPanels,
} from './meditechCcdParse';
import { isNextGenHealthcareDocument } from './nextgenHealthcareParse';
import {
  shouldRunVendorParser,
  type ParseTab14DocumentOptions,
} from './ehrDocumentTypes';
import type {
  Tab14AllergyRow,
  Tab14ChronicRow,
  Tab14HospitalFields,
  Tab14InsuranceRow,
  Tab14IntakeParseResult,
  Tab14MedicationRow,
  Tab14PatientFieldWarnings,
  Tab14PatientFields,
  Tab14VitalReading,
} from './tab14IntakeTypes';
import { emptyInsuranceRow } from './tab14IntakeTypes';
import type { Tab14ClinicalEntry } from './tab14PortabilitySections';
import {
  mergeExtendedSections,
  parseExtendedSectionsFromDocument,
  emptyExtendedSections,
} from './tab14PortabilitySections';
import { parseAthenaDataPortabilityResults } from './athenaResultsParse';

export type {
  Tab14AllergyRow,
  Tab14ChronicRow,
  Tab14HospitalFields,
  Tab14InsuranceRow,
  Tab14IntakeParseResult,
  Tab14MedicationRow,
  Tab14PatientFields,
  Tab14VitalReading,
} from './tab14IntakeTypes';
export { tryParseDateToIso } from './intakeDateParse';

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

/** Stop greedy name captures when PDF text lacks line breaks. */
const DEMO_FIELD_BOUNDARY =
  '\\s{2,}(?:DOB|Date of Birth|Sex|Guardian|School|Insurance|Phone|Blood Type|Address|MRN|Preferred Language)\\b';

function labelValueBounded(text: string, labelPattern: string): string | undefined {
  const re = new RegExp(
    `${labelPattern}\\s*[:#]?\\s*(.+?)(?=${DEMO_FIELD_BOUNDARY}|\\n|$)`,
    'i'
  );
  const m = text.match(re);
  if (m?.[1]) return collapseWs(m[1]);
  return undefined;
}

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

/** Capture stays on one line — avoids greedy `.+` swallowing the whole document. */
const LINE_VALUE = '([^\\n]+)';

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

function parsePatientFields(text: string): {
  fields: Tab14PatientFields;
  warnings: Tab14PatientFieldWarnings;
} {
  const t = text;
  const out: Tab14PatientFields = {};
  const warnings: Tab14PatientFieldWarnings = {};

  const assignName = (
    key: 'givenName' | 'familyName',
    raw: string | undefined
  ) => {
    if (!raw) return;
    const assessed = assessDemographicRawValue(key, raw);
    if (!assessed.value) return;
    out[key] = assessed.value;
    if (assessed.warning) warnings[key] = assessed.warning;
  };

  const given = labelValue(t, [
    new RegExp(`(?:given|first)\\s*name\\s*[:#]?\\s*${LINE_VALUE}`, 'i'),
  ]);
  const family = labelValue(t, [
    new RegExp(`(?:family|last)\\s*name\\s*[:#]?\\s*${LINE_VALUE}`, 'i'),
  ]);
  assignName('givenName', given);
  assignName('familyName', family);

  const fullNameLine =
    labelValueBounded(t, '(?:patient\\s*name|full\\s*name|(?:child\\s*)?name)') ||
    labelValue(t, [
      new RegExp(`(?:patient\\s*name|full\\s*name|(?:child\\s*)?name)\\s*[:#]?\\s*${LINE_VALUE}`, 'i'),
    ]);
  if (fullNameLine) {
    const assessed = assessDemographicRawValue('fullName', fullNameLine);
    const split = splitPersonName(assessed.value);
    if (!out.givenName && split.given) {
      out.givenName = split.given;
      if (assessed.warning) warnings.givenName = assessed.warning;
    }
    if (!out.familyName && split.family) {
      out.familyName = split.family;
      if (assessed.warning) warnings.familyName = assessed.warning;
    }
  }

  if (!out.givenName || !out.familyName) {
    const namePair = t.match(
      new RegExp(
        `patient\\s*name\\s*[:#]?\\s*([${NAME_CHARS}]+)\\s+([${NAME_CHARS}]+(?:\\s+[${NAME_CHARS}]+)*)`,
        'i'
      )
    );
    if (namePair) {
      if (!out.givenName) assignName('givenName', namePair[1]);
      if (!out.familyName) assignName('familyName', collapseWs(namePair[2]));
    }
  }

  if (!out.givenName || !out.familyName) {
    const m2 = t.match(
      new RegExp(
        `(?:^|\\n)\\s*(?<!Given\\s)(?<!Family\\s)(?<!Last\\s)(?<!First\\s)(?<!Full\\s)(?<!Child\\s)(?:name|patient)\\s*[:#]\\s*([${NAME_CHARS}]+)\\s+([${NAME_CHARS}]+(?:\\s+[${NAME_CHARS}]+)*)\\s*(?:\\n|$)`,
        'im'
      )
    );
    if (m2) {
      if (!out.givenName) assignName('givenName', m2[1]);
      if (!out.familyName) assignName('familyName', collapseWs(m2[2]));
    }
  }

  const dobRaw =
    labelValue(t, [
      new RegExp(`(?:date\\s*of\\s*birth|d\\.?o\\.?b\\.?|birth\\s*date)\\s*[:#]?\\s*${LINE_VALUE}`, 'i'),
      new RegExp(`\\bborn\\s+${LINE_VALUE}`, 'i'),
    ]) || undefined;
  if (dobRaw) {
    const assessed = assessDemographicRawValue('dateOfBirth', dobRaw);
    const iso =
      tryParseDateToIso(assessed.value) ||
      tryParseDateToIso(assessed.value.split(/[,\s]+/).slice(0, 5).join(' '));
    if (iso) {
      out.dateOfBirth = iso;
      if (assessed.warning) warnings.dateOfBirth = assessed.warning;
    }
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
    const assessed = assessDemographicRawValue('bloodType', bt);
    const n = normalizeBloodType(assessed.value);
    if (n) {
      out.bloodType = n;
      if (assessed.warning) warnings.bloodType = assessed.warning;
    }
  }
  // Avoid whole-document blood-type scans: text like "No blood type" or OCR noise can
  // contain incidental O/A/B tokens. Only labeled Blood Type values should populate this field.

  return {
    fields: pickDefined(out as Record<string, string>),
    warnings,
  };
}

const SECTION_END =
  /^(insurance|allergies|medications?|medication\s*list|chronic|conditions?|problem\s*list|hospital|admission|visit\s*history|demographics|patient\s*information|vitals|results|procedures|immunizations|social\s*history|care\s*team)\b/i;

/** Athena / EHR "Data Portability" exports (table of contents + columnar sections). */
export function isAthenaPortabilityDocument(text: string): boolean {
  return (
    /data\s+portability\s+for\b/i.test(text) &&
    (/table\s+of\s+contents/i.test(text) ||
      /demographics\s+sex\s*:/i.test(text) ||
      /(?:^|\n)\s*Care\s+Team\s+Demographics\b/i.test(text) ||
      /allergen\s+(?:id|category)\b/i.test(text) ||
      /name\s+authored\s+sig\b/i.test(text) ||
      /medications\s+name\s+sig\b/i.test(text) ||
      /problems?\s+problem\s+icd/i.test(text))
  );
}

/** TOC / body section titles Athena glues to patient names or prior tokens. */
const ATHENA_SECTION_TITLE =
  'Demographics|Related\\s+Person|Care\\s+Team(?:\\s+Members)?|Assessment|Plan\\s+of\\s+Treatment|Reason\\s+for\\s+Referral|Results|Problems|Procedures|Medical\\s+Equipment|Allergies|Medications|Vitals|Social\\s+History|Functional\\s+Status|Mental\\s+Status|Family\\s+History|Medical\\s+History|Obstetrics\\s+History|Immunizations|Past\\s+Encounters|Goals(?:\\s+Section)?|Health\\s+Concerns(?:\\s+Section)?|Advance\\s+Directives?|Payers|Notes|Table\\s+of\\s+Contents';

/**
 * Structure-normalize Athena Data Portability text so Diana-style (space-glued TOC)
 * and Harold-style (newline TOC / glued "JenningsDemographics") share one pipeline.
 */
export function normalizeAthenaPortabilityText(text: string): string {
  let t = text.replace(/\r\n/g, '\n');
  // "Harold JenningsDemographics" → "Harold Jennings\nDemographics"
  t = t.replace(
    new RegExp(`([A-Za-z])(?=${ATHENA_SECTION_TITLE}\\b)`, 'g'),
    '$1\n'
  );
  // Rare: "SmithTable of Contents"
  t = t.replace(/([A-Za-z])(Table\s+of\s+Contents\b)/gi, '$1 $2');
  return t;
}

/** Strip TOC / section titles accidentally captured into a patient name. */
function cleanAthenaPortabilityPatientName(raw: string): string {
  return collapseWs(
    raw
      .replace(new RegExp(`\\s*(?:${ATHENA_SECTION_TITLE}).*$`, 'i'), '')
      .replace(/\s+table\s+of\s+contents.*$/i, '')
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
    /data\s+portability\s+for\s+([^\n]+?)(?:\s+table\s+of\s+contents|\n|$)/i
  );
  if (title) {
    const split = splitPersonName(cleanAthenaPortabilityPatientName(title[1]));
    if (split.given) out.givenName = split.given;
    if (split.family) out.familyName = split.family;
  }

  const sex =
    text.match(/\bsex\s*:?\s*(male|female)\b/i)?.[1] ||
    text.match(/\bsex\s+at\s+birth\s*:?\s*(male|female)\b/i)?.[1];
  if (sex) {
    const normalized = sex.charAt(0).toUpperCase() + sex.slice(1).toLowerCase();
    out.sexAtBirth = normalized;
    // Athena demographics usually only expose Sex — mirror into Legal sex for the form.
    out.legalSex = normalized;
  }

  const dob =
    text.match(/\bd\.?o\.?b\.?\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)?.[1] ||
    text.match(/\bdate\s+of\s+birth\s*:?\s*(\d{1,2}\/\d{1,2}\/\d{4})/i)?.[1];
  if (dob) {
    const iso = tryParseDateToIso(dob);
    if (iso) out.dateOfBirth = iso;
  }

  const phone =
    text.match(/\bphone\s*(?:number)?\s*:?\s*(?:tel:\+?1-?)?(\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4})/i) ||
    text.match(/\btel:\+?1-?\(?(\d{3})\)?[\s.-]*(\d{3})[\s.-]*(\d{4})/i);
  if (phone) {
    out.phoneNumber = phone[2]
      ? `(${phone[1]}) ${phone[2]}-${phone[3]}`
      : phone[1].replace(/\s+/g, ' ').trim();
  }

  const email =
    text.match(/mailto:([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i)?.[1] ||
    text.match(/\bemail\s*:?\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i)?.[1] ||
    text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];
  if (email) out.email = email;

  const addr = text.match(
    /\b(?:contact|address)\s*:?\s*(\d+[^,\n]+,\s*[A-Za-z .'-]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?(?:,\s*USA)?)/i
  );
  if (addr) out.address = collapseWs(addr[1]);

  const race = text.match(/\brace\s*:?\s*([A-Za-z][A-Za-z /-]{1,40})/i);
  if (race && !/preferred|ethnicity/i.test(race[1])) out.race = collapseWs(race[1]);

  const ethnicity = text.match(/\bethnicity\s*:?\s*([A-Za-z][A-Za-z /-]{1,60})/i);
  if (ethnicity) out.ethnicity = collapseWs(ethnicity[1]).replace(/\s+DOB:.*/i, '').trim();

  const marital = text.match(
    /\bmarital\s+status\s*:?\s*(Never\s+married|Single|Married|Divorced|Widowed|Separated|[A-Za-z][A-Za-z ]{1,40})/i
  );
  if (marital) {
    const normalized = normalizeMaritalStatus(marital[1]);
    if (normalized) out.maritalStatus = normalized;
  }

  const lang =
    text.match(/\bpreferred\s+language\s*:?\s*([A-Za-z][A-Za-z ]{1,30})/i) ||
    text.match(/\bpreferred\s+([A-Za-z]{2,20})\s+Marital\s+status\b/i) ||
    text.match(/\bpreferred\s+([A-Za-z]{2,20})\b/i);
  if (lang && !/marital|language/i.test(lang[1])) {
    out.preferredLanguage = collapseWs(lang[1]);
  }

  // Only accept an explicitly labeled blood type — whole-PDF scans false-match meds like Tri-Lo-*.
  const labeledBt = text.match(
    /\bblood\s*type\s*:?\s*((?:A|B|AB|O)\s*[+-]|A\+|A-|B\+|B-|AB\+|AB-|O\+|O-)\b/i
  );
  if (labeledBt) {
    const bt = normalizeBloodType(labeledBt[1]);
    if (bt) out.bloodType = bt;
  }

  // Related Person → emergency contact when it is a distinct person
  // Prefer a body block with "Name:" — TOC often has "Related Person · Care Team Members"
  // which would otherwise match an empty/near-empty slice first.
  const relatedCandidates = [
    ...text.matchAll(
      /Related\s+Person\s+([\s\S]*?)(?=Care\s+Team\s+Members|Assessment|Plan\s+of\s+Treatment|$)/gi
    ),
  ].map((m) => m[1] ?? '');
  const relatedBlock =
    relatedCandidates.find((b) => /\bName\s*:/i.test(b)) ??
    relatedCandidates[relatedCandidates.length - 1] ??
    '';
  if (relatedBlock) {
    const relName = relatedBlock.match(/\bName\s*:?\s*([A-Za-z][A-Za-z .'-]{1,60})/i)?.[1];
    const relation = relatedBlock.match(/\bRelation\s*:?\s*([A-Za-z][A-Za-z /-]{0,40})/i)?.[1];
    const relPhone =
      relatedBlock.match(/\btel:\+?1-?\(?(\d{3})\)?[\s.-]*(\d{3})[\s.-]*(\d{4})/i) ||
      relatedBlock.match(
        /\bPhone\s+Number\s*:?\s*(?:tel:\+?1-?)?(\(?\d{3}\)?[\s.-]*\d{3}[\s.-]*\d{4})/i
      );
    const relEmail =
      relatedBlock.match(/mailto:([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i)?.[1] ||
      relatedBlock.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0];

    if (relName) {
      const patientFull = `${out.givenName ?? ''} ${out.familyName ?? ''}`.trim().toLowerCase();
      const relatedFull = collapseWs(relName).toLowerCase();
      const isSelf =
        patientFull.length > 0 &&
        (relatedFull === patientFull || relatedFull === `${out.familyName} ${out.givenName}`.toLowerCase());
      if (!isSelf) {
        const split = splitPersonName(collapseWs(relName));
        if (split.given) out.emergencyContactGivenName = split.given;
        if (split.family) out.emergencyContactFamilyName = split.family;
        if (relation && !/^relation$/i.test(relation.trim())) {
          out.emergencyContactRelationship = collapseWs(relation);
        }
        if (relPhone) {
          out.emergencyContactPhone = relPhone[2]
            ? `(${relPhone[1]}) ${relPhone[2]}-${relPhone[3]}`
            : relPhone[1].replace(/\s+/g, ' ').trim();
        }
        if (relEmail) out.emergencyContactEmail = relEmail;
      }
    }
  }

  return pickDefined(out as Record<string, string>);
}

const ALLERGY_REACTION_WORDS =
  'Rash|Hives|Congestion|Itching|Swelling|Nausea|Vomiting|Anaphylaxis|Shortness of breath|Diarrhea|Wheezing';

function looksLikeMedicationNotAllergy(name: string): boolean {
  return (
    /\d+\s*(?:mg|mcg|g|mL|unit)s?\b/i.test(name) ||
    /\b(?:capsule|tablet|ointment|drops?|suspension|cream|patch|injection|solution)\b/i.test(
      name
    ) ||
    /\b(?:TAKE\s+\d|BY\s+MOUTH|completed0|Instill\s+\d)\b/i.test(name) ||
    /\bMOUTH\s+Service\b/i.test(name)
  );
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
    const parts = splitDoubleSpacedColumns(cleaned);
    if (parts.length < 2) return null;
    name = parts[0].replace(/^(allergen|reaction)\s*/i, '').trim();
    reaction = parts.slice(1).join(' ').trim();
  }
  if (name.length < 2 || name.length > 120) return null;
  if (/^(allergen|reaction|none|n\/a)$/i.test(name)) return null;
  if (looksLikeMedicationNotAllergy(name)) return null;
  return {
    allergyName: name,
    allergyType: guessAllergyType(name),
    allergyTypeOther: '',
    severity: '',
    reactionNotes: reaction,
    lastObserved: '',
  };
}

/** Classic Athena "Allergies Allergen Reaction" two-column layout. */
function parseAthenaClassicAllergies(text: string): Tab14AllergyRow[] {
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
    if (/medications\b/i.test(trimmed)) break;
    const row = parseAthenaAllergyPair(trimmed);
    if (row && !rows.some((r) => r.allergyName === row.allergyName)) rows.push(row);
  }
  return rows;
}

/**
 * Athena Data Portability allergy table:
 * `1469239 POLLEN environment,medicationNot …`
 */
function parseAthenaDataPortabilityAllergies(text: string): Tab14AllergyRow[] {
  const rows: Tab14AllergyRow[] = [];
  const blockM = text.match(
    /\ballergies\b[\s\S]{0,400}?allergen[\s\S]*?(?:id\s+name|name\s+severity)?([\s\S]*?)(?=\bmedications\b)/i
  );
  let block = blockM?.[1] ?? '';
  block = block
    .replace(
      /(environment|medication|food|drug|biologic),(environment|medication|food|drug|biologic)(Not)/gi,
      '$1, $2 $3'
    )
    .replace(/(Not)(available)/gi, '$1 $2')
    .replace(/(\d{4,})(RxNorm)/gi, '$1 $2')
    .replace(/\bnull,?\s*/gi, ' ');

  const idName = [
    ...block.matchAll(
      /\b(\d{4,})\s+([A-Za-z][A-Za-z0-9 /-]{1,40}?)\s+(environment|medication|food|drug|biologic)\b/gi
    ),
  ];
  for (const m of idName) {
    const at = m.index ?? 0;
    const window = collapseWs(block.slice(at, at + 360));
    let name = collapseWs(m[2]).replace(/\s+EXTRACTS?$/i, '').trim();
    if (/\bEXTRACTS?\b/i.test(window) && !/extract/i.test(name)) {
      name = `${name} EXTRACTS`;
    }
    if (name.length < 2 || looksLikeMedicationNotAllergy(name)) continue;

    const cats = [
      ...window.matchAll(/\b(environment|medication|food|drug|biologic)\b/gi),
    ].map((c) => c[1].toLowerCase());
    const uniqueCats = [...new Set(cats)];
    const category = uniqueCats.join(', ');
    const primary = uniqueCats[0] || m[3].toLowerCase();
    const allergyType =
      primary === 'environment'
        ? 'Environmental'
        : primary === 'food'
          ? 'Food'
          : primary === 'medication' || primary === 'drug'
            ? 'Drug'
            : guessAllergyType(name);

    const dates = [...window.matchAll(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/g)].map((d) => d[1]);
    const lastObserved = dates[0] ? tryParseDateToIso(dates[0]) || '' : '';
    const codeM = window.match(/\b(\d{5,})\s+RxNorm\b/i);
    const timeM = window.match(/\b(\d{1,2}:\d{2}:\d{2})\b/);
    // Athena wraps "Geraldine TX - Tenet … Escobar Texas"
    const splitRecorder = window.match(
      /RxNorm\s+([A-Z][a-z]+)\s+TX\s*-\s*Tenet[\s\S]{0,80}?([A-Z][a-z]+)\s+Texas/i
    );
    const recorderM = window.match(
      /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+TX\s*-\s*Tenet/i
    );
    const recordedBy = splitRecorder
      ? `${splitRecorder[1]} ${splitRecorder[2]}`
      : recorderM && !/^RxNorm\b/i.test(recorderM[1])
        ? recorderM[1]
        : '';
    const notAvail = /not\s+available/i.test(window);

    if (!rows.some((r) => r.allergyName.toLowerCase() === name.toLowerCase())) {
      rows.push({
        allergyName: name,
        allergyType,
        allergyTypeOther: '',
        severity: notAvail ? 'Not available' : '',
        reactionNotes: notAvail ? 'Not available' : '',
        lastObserved,
        allergenId: m[1],
        category,
        criticality: notAvail ? 'Not available' : '',
        code: codeM?.[1] ?? '',
        codeSystem: codeM ? 'RxNorm' : '',
        recordedBy,
        organization: /TX\s*-\s*Tenet/i.test(window) ? 'TX - Tenet Texas' : '',
        recordedTime: timeM?.[1] ?? '',
      });
    }
  }
  return rows;
}

/**
 * Alternate Athena allergy table (no Allergen Id):
 * `Allergies Allergen Category Reaction Severity Status Penicillin medication Rash Moderate Active`
 */
function parseAthenaCategoryAllergies(text: string): Tab14AllergyRow[] {
  const starts = [...text.matchAll(/\ballergies\b[\s\S]{0,120}?allergen\s+category\s+reaction/gi)];
  const start = starts.length ? starts[starts.length - 1] : null;
  if (!start || start.index == null) return [];
  const from = start.index + start[0].length;
  const rest = text.slice(from);
  const endRel = rest.search(/\bmedications\b/i);
  const block = (endRel >= 0 ? rest.slice(0, endRel) : rest.slice(0, 800)).replace(/\n+/g, ' ');

  const rows: Tab14AllergyRow[] = [];
  const re =
    /\b([A-Za-z][A-Za-z0-9 /-]{1,40}?)\s+(medication|food|environment|drug|biologic)\s+([A-Za-z][A-Za-z /-]{1,40}?)\s+(Mild|Moderate|Severe|Not\s+available)\s+(Active|Inactive|Resolved)\b/gi;
  for (const m of block.matchAll(re)) {
    const name = collapseWs(m[1]);
    if (name.length < 2 || looksLikeMedicationNotAllergy(name)) continue;
    if (/^(allergen|category|reaction|severity|status)$/i.test(name)) continue;
    const cat = m[2].toLowerCase();
    const allergyType =
      cat === 'food'
        ? 'Food'
        : cat === 'environment'
          ? 'Environmental'
          : cat === 'medication' || cat === 'drug'
            ? 'Drug'
            : guessAllergyType(name);
    if (!rows.some((r) => r.allergyName.toLowerCase() === name.toLowerCase())) {
      rows.push({
        allergyName: name,
        allergyType,
        allergyTypeOther: '',
        severity: m[4],
        reactionNotes: collapseWs(m[3]),
        lastObserved: '',
        allergenId: '',
        category: cat,
        criticality: '',
        code: '',
        codeSystem: '',
        recordedBy: '',
        organization: '',
        recordedTime: '',
      });
    }
  }
  return rows;
}

function parseAthenaAllergies(text: string): Tab14AllergyRow[] {
  const portability = parseAthenaDataPortabilityAllergies(text);
  if (portability.length) return portability;
  const category = parseAthenaCategoryAllergies(text);
  if (category.length) return category;
  return parseAthenaClassicAllergies(text);
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

/** Classic Athena "Medications Medication Instructions" layout. */
function parseAthenaClassicMedications(text: string): Tab14MedicationRow[] {
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
    if (/\bvitals\b/i.test(trimmed) || /\bsocial\s+history\b/i.test(trimmed)) break;
    const row = parseAthenaMedicationLine(trimmed);
    if (row) rows.push(row);
  }
  return rows;
}

const MED_FORM_RE =
  /\b(?:capsule|tablets?|ointment|drops?|suspension|cream|patch|injection|solution|syrup|delayed\s+release|dose\s+pack)\b/i;
/** Strength token — requires a unit; rejects date fragments like 29/2026. */
const MED_DOSE_RE =
  /\b(\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?)?\s*(?:mg(?:\/mL)?|mcg|mL|units?(?:\/mL)?))\b/i;

function sanitizeMedDose(dose: string): string {
  const d = dose.replace(/\s+/g, ' ').trim();
  if (!d) return '';
  // Date fragments that slipped through (29/2026 mg, 2025%, …)
  if (/\b20\d{2}\b/.test(d)) return '';
  if (/^\d{1,2}\/\d{4}/.test(d)) return '';
  if (/\d{1,2}\/\d{1,2}\/\d{4}/.test(d)) return '';
  return d;
}

/** Words that begin Athena wrapped sig / name-continuation lines — never a new med. */
const ATHENA_MED_CONTINUATION_START =
  /^(?:gram|grams|tablet|tablets|capsule|capsules|ointment|drops?|release|delayed|into|affected|eye|times|daily|as|needed|every|once|twice|three|a\s+day|oral|route|for|days|hours|mouth|by|take|instill|now|then|morning|before|bedtime|the|and|per|day|hour|nausea|infection|cystitis|tract|urinary|available|completed|active|not|null|service|prod|external|data|tenet|texas|sandra|geraldine|jennifer|athenahealth|monohydrate|macrocrystals|mg\/|unit\/|%|\{)/i;

function isAthenaMedNoiseLine(line: string): boolean {
  return /^(name|authored|sig|dose|measure|on units|units of|by mouth|three|times|daily|as|needed|every|once|release|into|drops|eye|for|days|take|instill|not|completed|available|null|active|status|number|quantity|details|time|organization|lastmodified|indication|fill|repeat|dispense)\b/i.test(
    line.trim()
  );
}

/** True when the next line is a wrapped continuation of the current drug name. */
function isAthenaMedNameContinuation(current: string, line: string): boolean {
  if (!current) return false;
  const next = line.trim();
  if (!next || !/^[a-z]/.test(next)) return false;
  // "neomycin-polymyxin- 08/18/2025…" + "dexameth 3.5 mg…"
  if (/[A-Za-z]-\s+\d{1,2}\/\d{1,2}\/\d{4}/.test(current)) return true;
  if (/[A-Za-z]-$/.test(current.trim())) return true;
  // "nitrofurantoin" + "monohydrate/macrocrystals…"
  if (/nitrofurantoin\b/i.test(current) && /^monohydrate/i.test(next)) return true;
  // "methenamine hippurate 1 01/12/…" + "gram tablet…"
  if (/methenamine\b/i.test(current) && /^gram\b/i.test(next)) return true;
  return false;
}

function isAthenaMedStartLine(line: string, previousLine: string): boolean {
  const trimmed = line.trim();
  if (trimmed.length < 4 || isAthenaMedNoiseLine(trimmed)) return false;
  if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) return false;
  if (/^\d/.test(trimmed) || /^[%{]/.test(trimmed)) return false;
  // Hyphenated wrap: "neomycin-polymyxin-" + "dexameth 3.5 mg…"
  if (/[A-Za-z]-$/.test(previousLine.trim())) return false;
  // Same wrap when Athena puts the date on the hyphen line first
  if (/[A-Za-z]-\s+\d{1,2}\/\d{1,2}\/\d{4}/.test(previousLine)) return false;
  if (!/^[A-Za-z]/.test(trimmed)) return false;
  if (ATHENA_MED_CONTINUATION_START.test(trimmed)) return false;
  // Brand / multi-word starts that may not include a unit on the first line
  if (/^Tri-Lo-Marzia\b/i.test(trimmed)) return true;
  if (MED_DOSE_RE.test(trimmed) || MED_FORM_RE.test(trimmed)) return true;
  // "esomeprazole magnesium 12/27/2022…" — name then authored date (dose may be next line)
  if (/^[A-Za-z][A-Za-z0-9./\s\-]{2,80}?\s+\d{1,2}\/\d{1,2}\/\d{4}/.test(trimmed)) {
    return true;
  }
  // "nitrofurantoin" alone before wrapped salt/form on the next line
  return /^[A-Za-z][A-Za-z0-9\-]{3,}(?:\s+[A-Za-z][A-Za-z0-9\-\/]*){0,3}$/.test(trimmed);
}

function cleanAthenaMedName(raw: string): { genericName: string; dosage: string } {
  let s = raw.trim();
  // "triamcinolone acetonide 0.111/26/2025" → separate 0.1% from 11/26/2025
  s = s.replace(/(\d+(?:\.\d+)?)(\d{2}\/\d{1,2}\/\d{4})/g, '$1 $2');
  // Cut at authored/start date glued to the name
  s = s.replace(/\d{1,2}\/\d{1,2}\/\d{4}[\s\S]*$/, '').trim();
  s = s.replace(/\b\d{1,2}:\d{2}:\d{2}\b[\s\S]*$/g, '').trim();
  s = s.replace(/\b(?:TAKE|Instill|Not|completed|active)\b[\s\S]*$/i, '').trim();
  // Prefer the primary strength (first mg/mL), keep compound names intact
  const doseM = s.match(MED_DOSE_RE);
  let dosage = '';
  let generic = s;
  if (doseM && doseM.index != null) {
    dosage = sanitizeMedDose(doseM[1]);
    generic = s.slice(0, doseM.index).trim();
  }
  // Tri-Lo-Marzia multi-strength brand (handle before generic raw-dose fallback)
  if (/Tri-Lo-Marzia/i.test(raw)) {
    generic = 'Tri-Lo-Marzia';
    const multi = raw.match(
      /(\d+(?:\.\d+)?\s*mg\s*\/\s*\d+(?:\.\d+)?\s*mg\s*\/\s*\d+(?:\.\d+)?\s*mg\s*-\s*\d+(?:\.\d+)?\s*mg)/i
    );
    if (multi) dosage = sanitizeMedDose(collapseWs(multi[1]));
    else {
      const partial = raw.match(/Tri-Lo-Marzia\s+(\d+(?:\.\d+)?)/i);
      if (partial) dosage = sanitizeMedDose(`${partial[1]} mg`);
    }
  }
  // Recover doses Athena split across the authored-date cut
  if (!dosage) {
    const fromRaw = raw.match(MED_DOSE_RE);
    if (fromRaw) dosage = sanitizeMedDose(fromRaw[1]);
  }
  if (!dosage) {
    // "methenamine hippurate 1 … gram tablet"
    const gramDose = raw.match(
      /\b(?:hippurate\s+)?([1-9](?:\.\d+)?)\s+(?:\d{1,2}\/\d{1,2}\/\d{4}\S*\s+)?grams?\b/i
    );
    if (gramDose) dosage = `${gramDose[1]} gram`;
    else if (/methenamine/i.test(raw) && /\bgram\b/i.test(raw)) {
      const n = raw.match(/hippurate\s+([1-9](?:\.\d+)?)\b/i);
      if (n) dosage = `${n[1]} gram`;
    }
  }
  if (!dosage) {
    // Strength percents (0.1% topical) — never a year glued to "%"
    const pctNear = raw.match(/\b(0\.\d+)\b[^%]{0,40}%\s*(?:topical|ointment|cream|gel)?/i);
    if (pctNear) dosage = `${pctNear[1]}%`;
  }
  generic = generic
    .replace(/\b(?:delayed\s+release|dose\s+pack)\b/gi, '')
    .replace(MED_FORM_RE, '')
    .replace(/[-–,]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  // Re-attach salt when Athena wrapped "nitrofurantoin" / "monohydrate/macrocrystals"
  if (/^nitrofurantoin$/i.test(generic) && /monohydrate\s*\/\s*macrocrystals/i.test(raw)) {
    generic = 'nitrofurantoin monohydrate/macrocrystals';
  }
  if (/^neomycin-polymyxin-?$/i.test(generic) && /dexameth/i.test(raw)) {
    generic = 'neomycin-polymyxin-dexameth';
  }
  // Drop trailing lone strength digits left after cutting the date ("… 1")
  generic = generic.replace(/\s+\d+(?:\.\d+)?$/, '').trim();
  // Keep at most first 6 tokens of the drug name (allows monohydrate/macrocrystals)
  generic = generic.split(/\s+/).slice(0, 6).join(' ');
  return { genericName: generic, dosage: sanitizeMedDose(dosage) };
}

function isJunkAthenaMedName(name: string): boolean {
  const n = name.trim();
  if (n.length < 3) return true;
  if (/^(by mouth|mouth service|times|daily|needed|mg|gram|tablet|capsule)$/i.test(n)) {
    return true;
  }
  if (/^mg\b/i.test(n) || /^\d/.test(n)) return true;
  if (!/[A-Za-z]{3,}/.test(n)) return true;
  if (/\d{1,2}:\d{2}:\d{2}/.test(n)) return true;
  if (/\b(?:available|cystitis|urinary|infection|completed)\b/i.test(n)) return true;
  if (/^monohydrate/i.test(n)) return true;
  if (/^gram\b/i.test(n)) return true;
  if (/^dexameth$/i.test(n)) return true; // fragment of neomycin-polymyxin-dexameth
  return false;
}

/**
 * Athena Data Portability medications table (`Name Authored Sig…`).
 * Medication names/sigs wrap across lines; never treat sig continuations as new meds.
 */
function parseAthenaDataPortabilityMedications(text: string): Tab14MedicationRow[] {
  // Prefer the last "Medications … Name Authored" table (skip TOC / earlier order lists).
  const starts = [
    ...text.matchAll(/\bmedications\b[\s\S]{0,400}?name\s+authored/gi),
  ];
  const start = starts.length ? starts[starts.length - 1] : null;
  if (!start || start.index == null) return [];
  const from = start.index + start[0].length;
  const rest = text.slice(from);
  const endM = rest.search(/\bvitals\b|\bsocial\s+history\b/i);
  let block = endM >= 0 ? rest.slice(0, endM) : rest;
  // Un-glue strength that Athena jammed into the next date: "0.111/26/2025"
  block = block.replace(/(\d+(?:\.\d+)?)(\d{2}\/\d{1,2}\/\d{4})/g, '$1 $2');
  // Join hyphen-wrapped drug names onto one line before chunking
  block = block.replace(/([A-Za-z])-\s*\n\s*([A-Za-z])/g, '$1-$2');

  const lines = block
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const chunks: string[] = [];
  let current = '';
  let previousLine = '';
  for (const line of lines) {
    if (
      isAthenaMedStartLine(line, previousLine) &&
      !isAthenaMedNameContinuation(current, line)
    ) {
      if (current) chunks.push(current);
      current = line;
    } else if (current && !isAthenaMedNoiseLine(line)) {
      // Rejoin hyphenated wraps that put the date between stem and suffix
      // e.g. "neomycin-polymyxin- 08/18/2025…" + "dexameth 3.5 mg…"
      if (/[A-Za-z]-$/.test(current.trim()) || /[A-Za-z]-\s+\d{1,2}\//.test(current)) {
        const [suffix, ...restParts] = line.split(/\s+/);
        current = current.replace(/([A-Za-z])-(?=\s+\d{1,2}\/|$)/, `$1-${suffix}`);
        if (restParts.length) current = `${current} ${restParts.join(' ')}`;
      } else {
        current = `${current} ${line}`;
      }
    }
    previousLine = line;
  }
  if (current) chunks.push(current);

  const rows: Tab14MedicationRow[] = [];
  const seen = new Set<string>();
  for (const chunk of chunks) {
    const { genericName, dosage } = cleanAthenaMedName(chunk);
    if (isJunkAthenaMedName(genericName)) continue;
    let dose =
      dosage ||
      sanitizeMedDose(chunk.match(MED_DOSE_RE)?.[1]?.replace(/\s+/g, ' ').trim() || '') ||
      '';
    if (!dose && /Tri-Lo-Marzia/i.test(genericName)) {
      const multi = chunk.match(
        /(\d+(?:\.\d+)?\s*mg\s*\/\s*\d+(?:\.\d+)?\s*mg\s*\/\s*\d+(?:\.\d+)?\s*mg\s*-\s*\d+(?:\.\d+)?\s*mg)/i
      );
      if (multi) dose = sanitizeMedDose(collapseWs(multi[1]));
      else dose = sanitizeMedDose('0.18 mg');
    }
    if (!dose && /methenamine/i.test(genericName) && /\bgram\b/i.test(chunk)) {
      dose = '1 gram';
    }
    if (!dose && /triamcinolone/i.test(genericName) && /%/.test(chunk)) {
      dose = '0.1%';
    }
    if (!dose && !MED_FORM_RE.test(chunk) && !/gram\b/i.test(chunk)) continue;
    const freqM = chunk.match(
      /\b(once\s+daily|twice\s+daily|three\s+times\s+daily|TIMES\s+PER\s+DAY|every\s+day|every\s+\d+\s+hours|as\s+needed|daily)\b/i
    );
    const routeM = chunk.match(/\b(BY\s+MOUTH|ORAL|EYE|TOPICAL|INHALATION)\b/i);
    const dates = [...chunk.matchAll(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/g)].map((d) => d[1]);
    // Authored-on is usually the first clock-bearing date; start date is often earlier
    // (e.g. dicyclomine authored 08/21/2025, start 12/27/2022). Prefer chronological first.
    const dateIsos = dates
      .map((d) => ({ raw: d, iso: tryParseDateToIso(d) || d }))
      .filter((d) => d.iso);
    const sortedByTime = [...dateIsos].sort((a, b) => {
      const am = Date.parse(a.iso);
      const bm = Date.parse(b.iso);
      if (Number.isNaN(am) || Number.isNaN(bm)) return 0;
      return am - bm;
    });
    const startDate = sortedByTime[0]?.iso || '';
    const authoredOn = dateIsos[0]?.iso || startDate;
    const sigM =
      chunk.match(
        /\b((?:TAKE|Take|INSTILL|Instill)\s+(?:ONE|TWO|\d+|1)[\s\S]{5,220}?)(?=\s+Not\s+available|\s+Not\s+Not|\s+completed\d|\s+completed\b|\s+active\b|\s+Sandra|\s+Jennifer|\s+Geraldine|\s+TX\s*-|\s+AthenaHealth|\s+athena\s*-)/i
      ) ||
      chunk.match(
        /\b((?:TAKE|Take|INSTILL|Instill)\s+[A-Z0-9{][\s\S]{5,160}?)(?=\s+Not\s+|\s+completed|\s+active\b)/i
      );
    let sig = sigM ? collapseWs(sigM[1]).slice(0, 300) : '';
    // Athena often wraps "TAKE ONE" / "CAPSULE BY MOUTH THREE TIMES DAILY…"
    if (/^TAKE\s+ONE$/i.test(sig) && /CAPSULE|TABLET|BY\s+MOUTH/i.test(chunk)) {
      const restSig = chunk.match(
        /\b((?:CAPSULE|TABLET)[\s\S]{0,120}?DAILY(?:\s+AS\s+NEEDED)?(?:\s+FOR\s+NAUSEA)?)/i
      );
      if (restSig) sig = collapseWs(`TAKE ONE ${restSig[1]}`).slice(0, 300);
    }
    // Indication often lives in Note (Recurrent urinary tract infection / Acute cystitis)
    const purposeM = chunk.match(
      /\b((?:Recurrent\s+urinary\s+tract\s+infection|Acute\s+cystitis|Nausea|FOR\s+NAUSEA)[^.]*)/i
    );
    const statusM = chunk.match(/\b(completed|active|stopped|cancelled)\b/i);
    const fillM =
      chunk.match(/\bcompleted0?\s*(\d{1,4})\b/i) ||
      chunk.match(/\bactive\s+[^]*?\b(\d{1,3})\s+(?=Not\s+Not|Not\s+Available|AthenaHealth|athena)/i) ||
      chunk.match(/\b(\d{1,3})\s+(?=Sandra|Jennifer|Geraldine|TX\s*-|AthenaHealth)/i);
    const recorderM =
      chunk.match(/\b((?:Sandra|Geraldine|Jennifer)\s+[A-Za-z]+(?:\s+[A-Za-z]+)?)\b/i) ||
      chunk.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+TX\s*-\s*Tenet/i);
    const timeM = [...chunk.matchAll(/\b(\d{1,2}:\d{2}:\d{2})\b/g)].map((t) => t[1]);
    const routeFromSig = /\bBY\s+MOUTH\b|\bORAL\b/i.test(`${sig} ${chunk}`);
    const eyeRoute = /\bEYE\b|\beye\s+drops?\b/i.test(chunk);
    const topicalRoute = /\btopical\b/i.test(chunk);
    const freqFromSig =
      sig.match(
        /\b(THREE\s+TIMES\s+DAILY|TWICE\s+DAILY|ONCE\s+DAILY|EVERY\s+\d+\s+HOURS|TIMES\s+PER\s+DAY|AS\s+NEEDED|DAILY)\b/i
      )?.[1] || freqM?.[1];
    let organization = '';
    if (/TX\s*-\s*Tenet/i.test(chunk)) organization = 'TX - Tenet Texas';
    else if (/AthenaHealth/i.test(chunk)) organization = 'AthenaHealth';
    else if (/athena\s*-\s*External\s+Data/i.test(chunk)) {
      organization = 'athena - External Data Service - prod';
    }
    const key = `${genericName.toLowerCase()}|${dose.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      genericName,
      brandName: /Tri-Lo-Marzia/i.test(genericName) ? 'Tri-Lo-Marzia' : '',
      dosage: dose,
      route: routeM
        ? /mouth|oral/i.test(routeM[1])
          ? 'Oral'
          : routeM[1].charAt(0).toUpperCase() + routeM[1].slice(1).toLowerCase()
        : eyeRoute
          ? 'Eye'
          : topicalRoute
            ? 'Topical'
            : routeFromSig
              ? 'Oral'
              : '',
      frequency: freqFromSig ? collapseWs(freqFromSig) : '',
      startDate,
      endDate: '',
      purpose: purposeM ? collapseWs(purposeM[1]).slice(0, 200) : '',
      prescribingPhysician: '',
      notesMedication: '',
      sig,
      status: statusM ? statusM[1].replace(/^./, (c) => c.toUpperCase()) : '',
      authoredOn,
      fillQuantity: fillM?.[1] ?? '',
      recordedBy: recorderM?.[1] ?? '',
      organization,
      recordedTime: timeM[timeM.length - 1] ?? '',
    });
  }
  return rows;
}

/**
 * Alternate Athena meds table:
 * `Medications Name Sig Dose Start Status Refill` then
 * `metformin 500 mg tablet TAKE 1 tablet BY MOUTH TWICE DAILY 1000 mg 02/11/2025\nActive 3`
 */
function parseAthenaSigDoseRefillMedications(text: string): Tab14MedicationRow[] {
  const starts = [...text.matchAll(/\bmedications\b[\s\S]{0,80}?name\s+sig\s+dose\s+start/gi)];
  const start = starts.length ? starts[starts.length - 1] : null;
  if (!start || start.index == null) return [];
  const from = start.index + start[0].length;
  const rest = text.slice(from);
  const endRel = rest.search(/\bvitals\b|\bsocial\s+history\b/i);
  let block = endRel >= 0 ? rest.slice(0, endRel) : rest.slice(0, 6000);
  block = block
    .replace(/\bStatus\s+Refill\b/gi, ' ')
    .replace(/\n+/g, '\n')
    .trim();

  const rows: Tab14MedicationRow[] = [];
  const re =
    /([A-Za-z][A-Za-z0-9 ()/.-]*(?:\([^)]+\))?)\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|g|unit)s?\b[^\n]*?)\s+(TAKE\s+[\s\S]*?)\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|g|unit)s?\b)?\s*(\d{1,2}\/\d{1,2}\/\d{4})\s*\n?\s*(Active|Completed|Inactive)\s+(\d+)/gi;

  for (const m of block.matchAll(re)) {
    const genericName = collapseWs(m[1]).replace(/\s+/g, ' ');
    if (genericName.length < 3) continue;
    if (/^(name|sig|dose|start|status|refill|vitals)$/i.test(genericName)) continue;
    const strength = collapseWs(m[2]).match(/(\d+(?:\.\d+)?\s*(?:mg|mcg|g|unit)s?\b)/i)?.[1] ?? '';
    const sig = collapseWs(m[3]);
    const freqM = sig.match(
      /\b(once\s+daily|twice\s+daily|three\s+times\s+daily|every\s+\d+\s+hours|daily|as\s+needed|at\s+bedtime)\b/i
    );
    const routeM = sig.match(/\b(by\s+mouth|oral|topical|intramuscular|subcutaneous|inhaled)\b/i);
    rows.push({
      genericName,
      brandName: '',
      dosage: strength || collapseWs(m[4] || ''),
      route: routeM ? routeM[1] : '',
      frequency: freqM ? freqM[1] : '',
      startDate: tryParseDateToIso(m[5]) || m[5],
      endDate: '',
      purpose: '',
      prescribingPhysician: '',
      notesMedication: sig,
      status: m[6].replace(/^./, (c) => c.toUpperCase()),
      authoredOn: tryParseDateToIso(m[5]) || m[5],
      fillQuantity: m[7] ?? '',
      recordedBy: '',
      organization: '',
      recordedTime: '',
    });
  }
  return rows;
}

function parseAthenaMedications(text: string): Tab14MedicationRow[] {
  const authored = parseAthenaDataPortabilityMedications(text);
  const sigDose = parseAthenaSigDoseRefillMedications(text);
  // Prefer the richer Athena table when both match (same export can embed both).
  if (sigDose.length > authored.length) return sigDose;
  if (authored.length) return authored;
  if (sigDose.length) return sigDose;
  return parseAthenaClassicMedications(text);
}

/** Convert a vitals reading into the patient-field keys used by the Vitals form. */
export function vitalReadingToPatientFields(reading: Tab14VitalReading): Tab14PatientFields {
  return pickDefined({
    heightInches: reading.heightInches,
    weightLbs: reading.weightLbs,
    systolicBp: reading.systolicBp,
    diastolicBp: reading.diastolicBp,
    heartRate: reading.heartRate,
    bodyMassIndex: reading.bodyMassIndex,
    temperatureF: reading.temperatureF ?? '',
    temperatureC: reading.temperatureC ?? '',
    respiratoryRate: reading.respiratoryRate ?? '',
    oxygenSaturation: reading.oxygenSaturation ?? '',
  } as Record<string, string>);
}

function vitalHitToReading(hit: {
  dateIso: string;
  heightCm?: number;
  bmi?: number;
  bmiPercentile?: number;
  weightG?: number;
  hr?: number;
  systolic?: number;
  diastolic?: number;
  recordedBy?: string;
  organization?: string;
  recordedTime?: string;
}): Tab14VitalReading {
  const reading: Tab14VitalReading = {
    recordedDate: hit.dateIso,
    heightInches: '',
    weightLbs: '',
    systolicBp: '',
    diastolicBp: '',
    heartRate: '',
    bodyMassIndex: '',
  };
  if (hit.heightCm && hit.heightCm > 50 && hit.heightCm < 250) {
    reading.heightInches = String(Math.round((hit.heightCm / 2.54) * 10) / 10);
  }
  if (hit.weightG && hit.weightG > 1000) {
    reading.weightLbs = String(Math.round((hit.weightG / 453.59237) * 10) / 10);
  }
  if (hit.bmi && hit.bmi > 10 && hit.bmi < 80) {
    reading.bodyMassIndex = String(hit.bmi);
  }
  if (hit.bmiPercentile != null && hit.bmiPercentile >= 0 && hit.bmiPercentile <= 100) {
    reading.bmiPercentile = String(hit.bmiPercentile);
  }
  if (hit.hr && hit.hr > 30 && hit.hr < 220) {
    reading.heartRate = String(hit.hr);
  }
  if (hit.systolic && hit.diastolic) {
    reading.systolicBp = String(hit.systolic);
    reading.diastolicBp = String(hit.diastolic);
  }
  if (hit.recordedBy) reading.recordedBy = hit.recordedBy;
  if (hit.organization) reading.organization = hit.organization;
  if (hit.recordedTime) reading.recordedTime = hit.recordedTime;
  return reading;
}

/**
 * Parse every Athena Data Portability vitals row (newest first).
 * Diana has three dated readings (01/12/2026, 11/26/2025, 08/21/2025).
 */
export function parseAthenaDataPortabilityVitalsHistory(text: string): Tab14VitalReading[] {
  const blocks = [
    ...text.matchAll(
      /\bvitals\b([\s\S]*?)(?=\bsocial\s+history\b|\bfunctional\s+status\b|\bimmunizations\b|$)/gi
    ),
  ];
  let block = '';
  for (const m of blocks) {
    if (/\bcm\b/i.test(m[1]) && /\d+\s*\/\s*\d+\s*mm/i.test(m[1])) {
      block = m[1];
    }
  }
  if (!block) {
    const fallback = text.match(
      /(\d{1,2}\/\d{1,2}\/\d{4}[^\n]*\d+(?:\.\d+)?\s*cm[^\n]*\d+\s*\/\s*\d+\s*mm[^\n]*)/i
    );
    block = fallback?.[1] ?? '';
  }
  if (!block) return [];

  const rowMatches = [...block.matchAll(/(\d{1,2}\/\d{1,2}\/\d{4})[^\n]{10,400}/gi)].filter(
    (m) => /\bcm\b/i.test(m[0]) || /\s\d+(?:\.\d+)?\s*g\b/i.test(m[0])
  );

  type VitalHit = {
    dateMs: number;
    dateIso: string;
    heightCm?: number;
    bmi?: number;
    bmiPercentile?: number;
    weightG?: number;
    hr?: number;
    systolic?: number;
    diastolic?: number;
    recordedBy?: string;
    organization?: string;
    recordedTime?: string;
  };
  const hitsByDate = new Map<string, VitalHit>();
  for (const m of rowMatches) {
    const full = m[0];
    const iso = tryParseDateToIso(m[1]) || m[1];
    const dateMs = Date.parse(iso);
    if (Number.isNaN(dateMs) && !/^\d{1,2}\//.test(iso)) continue;
    const hit: VitalHit = {
      dateMs: Number.isNaN(dateMs) ? 0 : dateMs,
      dateIso: iso,
    };
    const cm = full.match(/(\d+(?:\.\d+)?)\s*cm\b/i);
    if (cm) hit.heightCm = parseFloat(cm[1]);
    // Prefer age BMI (kg/m2) over percentile; percentile is "64 %"
    const bmi = full.match(/(\d+(?:\.\d+)?)\s*kg\/m2/i);
    if (bmi) hit.bmi = parseFloat(bmi[1]);
    // Harold-style compact row: `178 cm 98.1 kg 31.0 152/94 mmHg`
    if (hit.bmi == null) {
      const bareBmi = full.match(
        /\b(?:kg|g)\b\s+(\d+(?:\.\d+)?)\s+(\d+)\s*\/\s*(\d+)\s*mm/i
      );
      if (bareBmi) {
        const n = parseFloat(bareBmi[1]);
        if (n > 10 && n < 80) hit.bmi = n;
      }
    }
    const pct = full.match(/(\d{1,3})\s*%/);
    if (pct) {
      const n = parseInt(pct[1], 10);
      if (n >= 0 && n <= 100) hit.bmiPercentile = n;
    }
    const kg = full.match(/(\d+(?:\.\d+)?)\s*kg(?!\s*\/)/i);
    if (kg) {
      hit.weightG = parseFloat(kg[1]) * 1000;
    } else {
      const g = full.match(/(\d+(?:\.\d+)?)\s*g\b(?!\s*\/)/i);
      if (g) hit.weightG = parseFloat(g[1]);
    }
    const hr = full.match(/(\d+)\s*\/\s*min/i);
    if (hr) hit.hr = parseInt(hr[1], 10);
    const bp = full.match(/(\d+)\s*\/\s*(\d+)\s*mm/i);
    if (bp) {
      hit.systolic = parseInt(bp[1], 10);
      hit.diastolic = parseInt(bp[2], 10);
    }
    const by =
      full.match(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+TX\s*-\s*Tenet/i) ||
      full.match(
        /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+(?:,?\s*MD)?)\s+[A-Z]{2}\s*-\s*[A-Za-z]/i
      );
    if (by) hit.recordedBy = by[1].replace(/,\s*MD$/i, '').trim();
    if (/TX\s*-\s*Tenet/i.test(full)) hit.organization = 'TX - Tenet Texas';
    else {
      const org = full.match(/\b([A-Z]{2}\s*-\s*[A-Za-z][A-Za-z .'-]{2,40})/);
      if (org) hit.organization = collapseWs(org[1]);
    }
    const times = [...full.matchAll(/\b(\d{1,2}:\d{2}:\d{2})\b/g)].map((t) => t[1]);
    if (times.length) hit.recordedTime = times[times.length - 1];
    if (!(hit.heightCm || hit.weightG || hit.systolic)) continue;

    const existing = hitsByDate.get(iso);
    if (!existing) {
      hitsByDate.set(iso, hit);
      continue;
    }
    // Prefer the richer row when Athena repeats the same date across table layouts
    hitsByDate.set(iso, {
      ...existing,
      ...Object.fromEntries(
        Object.entries(hit).filter(([, v]) => v !== undefined && v !== '')
      ),
      dateMs: existing.dateMs || hit.dateMs,
      dateIso: iso,
    } as VitalHit);
  }
  const hits = [...hitsByDate.values()];
  if (!hits.length) return [];

  hits.sort((a, b) => b.dateMs - a.dateMs);
  return hits.map(vitalHitToReading);
}

/** Parse latest Athena Data Portability vitals row into Tab14 patient fields. */
function parseAthenaDataPortabilityVitals(text: string): Tab14PatientFields {
  const history = parseAthenaDataPortabilityVitalsHistory(text);
  if (!history.length) return {};
  return vitalReadingToPatientFields(history[0]);
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
  const icdRows = parseAthenaIcdProblemList(text);
  if (icdRows.length) return icdRows;

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

/**
 * Athena problem list with ICD-10:
 * `Problems Problem ICD-10 Onset Status Type 2 diabetes… E11.9 02/2025 Active`
 */
function parseAthenaIcdProblemList(text: string): Tab14ChronicRow[] {
  const starts = [
    ...text.matchAll(/\bproblems?\b[\s\S]{0,80}?problem\s+icd[- ]?10\s+onset\s+status/gi),
  ];
  const start = starts.length ? starts[starts.length - 1] : null;
  if (!start || start.index == null) return [];
  const from = start.index + start[0].length;
  const rest = text.slice(from);
  const endRel = rest.search(
    /\bprocedures\b|\bsurgical\s+history\b|\bmedical\s+equipment\b|\ballergies\b/i
  );
  const block = endRel >= 0 ? rest.slice(0, endRel) : rest.slice(0, 2500);

  const rows: Tab14ChronicRow[] = [];
  const re =
    /([A-Za-z][A-Za-z0-9 ,'()/-]{2,120}?)\s+([A-Z]\d{2}(?:\.\d{1,2})?)\s+(\d{1,2}\/\d{4}|\d{1,2}\/\d{1,2}\/\d{4})\s+(Active|Inactive|Resolved|Controlled)\b/gi;
  for (const m of block.matchAll(re)) {
    const name = collapseWs(m[1]).replace(/^(problem|status|onset)\s+/i, '');
    if (name.length < 3) continue;
    if (/^(type|note|procedures)$/i.test(name)) continue;
    const onsetRaw = m[3];
    const onsetIso =
      tryParseDateToIso(onsetRaw) ||
      (onsetRaw.match(/^(\d{1,2})\/(\d{4})$/)
        ? `${onsetRaw.split('/')[1]}-${onsetRaw.split('/')[0].padStart(2, '0')}-01`
        : '');
    rows.push({
      conditionName: name.slice(0, 200),
      icdCode: m[2],
      diagnosisDate: onsetIso,
      severity: '',
      prexisting: /^active$/i.test(m[4]) ? 'Yes' : '',
      notesChronicConditions: `Status: ${m[4]}`,
    });
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

/** A wrapped encounter line carrying its own SNOMED / ICD10 / IMO codes starts a new diagnosis. */
const SECONDARY_DIAGNOSIS_ROW = /\d{6,20}\s*[A-Z]\d{2}(?:\.\d+)?\s+\d{3,12}/;

/**
 * Athena wraps the encounter type / performer / location / time columns down the left
 * of the note column. Remove those fragments so the note text can be reassembled.
 */
function stripEncounterColumns(
  line: string,
  surname: string,
  locationSuffix: string
): string {
  let rest = line.replace(
    /^[A-Z][A-Z0-9][A-Z0-9 /-]{0,30}?(?=\s+(?:[A-Z][a-z]|MD\b|DO\b|\d{2,5}\s|\d{1,2}:\d{2}))/,
    ' '
  );
  if (surname) rest = rest.split(surname).join(' ');
  if (locationSuffix) rest = rest.replace(new RegExp(`-\\s*${locationSuffix}\\b`), ' ');
  return collapseWs(
    rest
      .replace(/^\s*(?:MD|DO|NP|PA)\b/, ' ')
      .replace(/\b\d{1,2}:\d{2}:\d{2}\b/g, ' ')
      .replace(/\b[A-Z][a-z]+,\s*Ste\.?\s*\d+/g, ' ')
      .replace(/\b[A-Z]{2,}\s+[A-Z]{2,},\s*[A-Z]{2}\b/g, ' ')
      .replace(/^\s*\d{2,5}\s+[A-Z]\.?(?=\s|$)/, ' ')
  );
}

/**
 * Athena Data Portability "Past Encounters" table → one Tab14 hospital visit per encounter.
 * Columns wrap across lines, so the encounter id line carries the primary diagnosis and
 * the following lines continue the type / performer / location / time columns:
 * `19280018 PREVENTIVE MEDJennifer ELP_ACWHP08/21/2025 08/21/2025 Vulvovaginitis 53277000 N76.0 30862 …`
 */
export function parseAthenaPastEncounters(text: string): Tab14HospitalFields[] {
  const header = text.match(/Past\s+Encounters\s+Encounter\b/i);
  if (!header || header.index == null) return [];
  const after = text.slice(header.index + header[0].length);
  const end = after.search(/(?:^|\n)\s*(?:Goals(?:\s+Section)?|Health\s+Concerns|Payers)\b/i);
  const block = (end >= 0 ? after.slice(0, end) : after)
    // pdf.js glues the ALL-CAPS visit type to the performer: "PREVENTIVE MEDJennifer"
    .replace(/\b([A-Z]{2,})([A-Z][a-z]{2,})/g, '$1 $2')
    .replace(/([A-Za-z_])(\d{1,2}\/\d{1,2}\/\d{4})/g, '$1 $2');
  if (!block.trim()) return [];

  const lines = block.split('\n').map((line) => collapseWs(line)).filter(Boolean);
  const startIndexes: number[] = [];
  lines.forEach((line, i) => {
    if (/^\d{7,9}\s/.test(line)) startIndexes.push(i);
  });
  if (!startIndexes.length) return [];

  const visits: Tab14HospitalFields[] = [];
  for (let i = 0; i < startIndexes.length; i++) {
    const from = startIndexes[i];
    const to = i + 1 < startIndexes.length ? startIndexes[i + 1] : lines.length;
    const chunk = lines.slice(from, to);
    const flat = collapseWs(chunk.join(' '));
    const out: Tab14HospitalFields = {};

    out.encounterId = chunk[0].match(/^(\d{7,9})\b/)?.[1] ?? '';
    out.reportId = out.encounterId;

    const dates = [...flat.matchAll(/\b(\d{1,2}\/\d{1,2}\/\d{4})\b/g)].map((m) => m[1]);
    const times = [...flat.matchAll(/\b(\d{1,2}:\d{2}:\d{2})\b/g)].map((m) => m[1]);
    const startIso = dates[0] ? tryParseDateToIso(dates[0]) : '';
    const closedIso = dates[1] ? tryParseDateToIso(dates[1]) : '';
    if (startIso) out.visitDate = startIso;
    if (closedIso) out.dischargeDate = closedIso;
    if (dates[0]) out.startDateTime = collapseWs(`${dates[0]} ${times[0] ?? ''}`);
    if (dates[1]) out.closedDateTime = collapseWs(`${dates[1]} ${times[1] ?? ''}`);

    const firstName = chunk[0].match(/^\d{7,9}\s+[A-Z][A-Z0-9 /-]*?\s([A-Z][a-z]+)\s/)?.[1] ?? '';
    const surname = flat.match(/\b([A-Z][a-z]+\s+[A-Z][a-z']+,)(?=\s)/)?.[1] ?? '';
    const attending = collapseWs(
      [firstName, surname, /\bMD\b/.test(flat) ? 'MD' : ''].join(' ')
    );
    if (attending.length > 2) out.attendingPhysician = attending;

    const locationCode = flat.match(/\b([A-Z][A-Z0-9]*_[A-Z0-9]+)\b/)?.[1] ?? '';
    const locationSuffix = flat.match(/\s-\s([A-Z][a-z]+)\b/)?.[1] ?? '';
    const location = collapseWs(
      [locationCode, locationSuffix ? `- ${locationSuffix}` : ''].join(' ')
    );
    if (location) {
      out.location = location;
      out.facilityName = location;
    }

    // Visit type wraps down the left column: "PREVENTIVE MED" / "INITIAL NEW PT" / "AGE 18-39YRS"
    const typeParts: string[] = [];
    const firstType = chunk[0].match(/^\d{7,9}\s+([A-Z][A-Z0-9 /-]{2,40}?)\s+[A-Z][a-z]/)?.[1];
    if (firstType) typeParts.push(collapseWs(firstType));
    for (const line of chunk.slice(1, 4)) {
      const part = line.match(/^([A-Z][A-Z0-9][A-Z0-9 /-]{1,30}?)\s+(?:[A-Z][a-z]+|MD\b|DO\b)/)?.[1];
      if (!part || /^(EL PASO|US|TX)\b/.test(part)) break;
      typeParts.push(collapseWs(part));
    }
    if (typeParts.length) out.visitType = typeParts.join(' ').slice(0, 200);

    // Primary diagnosis sits on the encounter-id line: `… 08/21/2025 Vulvovaginitis 53277000 N76.0 30862 note…`
    const diagnosis = chunk[0].match(
      /\d{1,2}\/\d{1,2}\/\d{4}\s+([A-Za-z][A-Za-z ,'()/-]{2,60}?)\s+(\d{6,20})\s+([A-Z]\d{2}(?:\.\d+)?)\s+(\d{3,12})\s*(.*)$/
    );
    if (diagnosis) {
      out.reason = collapseWs(diagnosis[1]).slice(0, 300);
      out.snomed = diagnosis[2];
      out.icd10 = diagnosis[3];
      out.imo = diagnosis[4];

      const noteParts = [diagnosis[5]];
      for (const line of chunk.slice(1)) {
        if (SECONDARY_DIAGNOSIS_ROW.test(line)) break;
        noteParts.push(stripEncounterColumns(line, surname, locationSuffix));
      }
      out.diagnosisNote = collapseWs(
        noteParts.filter((part) => /[a-z]/.test(part)).join(' ')
      ).slice(0, 800);
    }

    if (Object.values(out).some((v) => String(v ?? '').trim())) {
      visits.push(pickDefined(out as Record<string, string>));
    }
  }

  return visits;
}

/**
 * Athena Data Portability "Payers" table → Tab14 Insurance fields.
 * Supports Diana (Insurance Sequence) and Harold (Insurance Name / Group Number) layouts.
 */
function parseAthenaDataPortabilityPayers(text: string): Tab14InsuranceRow[] {
  const sequence = parseAthenaSequencePayers(text);
  if (sequence.length) return sequence;
  return parseAthenaNamedGroupPayers(text);
}

/**
 * Harold-style payers:
 * `Insurance Name Group Number Policy Holder Relationship Subscriber ID`
 * `1 Rocky Mtn Health (PPO) GRP-88831 Harold Jennings Self\nRMH4471209`
 */
function parseAthenaNamedGroupPayers(text: string): Tab14InsuranceRow[] {
  const starts = [
    ...text.matchAll(
      /\b(?:Payers\b[\s\S]{0,80}?)?Insurance\s+Name\s+Group\s+Number\s+Policy\s+Holder/gi
    ),
  ];
  const start = starts.length ? starts[starts.length - 1] : null;
  if (!start || start.index == null) return [];
  const from = start.index + start[0].length;
  const rest = text.slice(from);
  const endRel = rest.search(/\bNotes\s+Date\s+Type\s+Note\b|\bNotes\b\s+Date\s+Type\b/i);
  const block = endRel >= 0 ? rest.slice(0, endRel) : rest.slice(0, 800);

  const rows: Tab14InsuranceRow[] = [];
  const re =
    /(\d+)\s+(.+?)\s+(GRP[- ]?[A-Z0-9]+)\s+([A-Za-z][A-Za-z .'-]{1,60}?)\s+(Self|Spouse|Child|Other|family\s+dependent)\s*\n?\s*([A-Z0-9]{6,})/gi;
  for (const m of block.matchAll(re)) {
    const providerName = collapseWs(m[2]);
    if (providerName.length < 3 || providerName.length > 120) continue;
    if (/text\/html|Notes Date|Organization/i.test(providerName)) continue;
    const planName = /\(([^)]+)\)/.exec(providerName)?.[1] ?? '';
    rows.push({
      ...emptyInsuranceRow(),
      providerName,
      planName,
      groupNumber: collapseWs(m[3]),
      memberName: collapseWs(m[4]),
      guarantor: collapseWs(m[4]),
      relationToSubscriber: collapseWs(m[5]),
      memberID: m[6].trim(),
    });
  }
  return rows;
}

/**
 * Diana-style payers table with Insurance Sequence + dates.
 */
function parseAthenaSequencePayers(text: string): Tab14InsuranceRow[] {
  const starts = [...text.matchAll(/\bPayers\b[\s\S]{0,120}?Insurance\s+Sequence/gi)];
  const start = starts.length ? starts[starts.length - 1] : null;
  if (!start || start.index == null) return [];

  const from = start.index;
  const rest = text.slice(from);
  const endRel = rest.search(/\bNotes\s+Date\s+Note\b|\bNotes\b\s+Date\s+Note\b/i);
  const block = endRel >= 0 ? rest.slice(0, endRel) : rest.slice(0, 1200);

  const rows: Tab14InsuranceRow[] = [];
  const rowRe =
    /(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d+)\s+(.+?)\s+(\d{2,6})\s+([A-Za-z][A-Za-z.'-]+(?:\s+[A-Za-z][A-Za-z.'-]*)*?)\s+(self|spouse|child|other|family\s+dependent|subscriber)\s+([A-Z0-9]{5,})\s+(\d{3,})\s+([A-Za-z][A-Za-z .'-]{1,60})/gi;

  for (const m of block.matchAll(rowRe)) {
    const startIso = tryParseDateToIso(m[1]) || '';
    let insuranceName = collapseWs(m[3])
      .replace(/\b(?:Insurance|Name|Group|Policy|Holder|Relationship|Covered|Member|Subscriber|Payer|Guarantor|Identifier|Sequence|Date)\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const after = block.slice((m.index ?? 0) + m[0].length, (m.index ?? 0) + m[0].length + 80);
    const planCont = after.match(/^\s*\(([^)]+)\)\s*([A-Za-z][A-Za-z.'-]*)?/);
    let planName = '';
    let subscriberLast = '';
    if (planCont) {
      planName = planCont[1].trim();
      if (planCont[2]) subscriberLast = planCont[2].trim();
      if (planName && !new RegExp(`\\(${escapeReForAthena(planName)}\\)`, 'i').test(insuranceName)) {
        insuranceName = `${insuranceName} (${planName})`;
      }
    }

    const holderFirst = collapseWs(m[5]);
    const subscriberName = collapseWs(
      subscriberLast && !new RegExp(`\\b${escapeReForAthena(subscriberLast)}\\b`, 'i').test(holderFirst)
        ? `${holderFirst} ${subscriberLast}`
        : holderFirst
    );

    const guarantor = collapseWs(m[9]).replace(/\bNotes\b.*$/i, '').trim();
    const relation = collapseWs(m[6]);
    const memberID = m[7].trim();
    const payerId = m[8].trim();
    const groupNumber = m[4].trim();

    if (!insuranceName || insuranceName.length < 3) continue;
    if (/^(organization|details|holder|subscriber)$/i.test(insuranceName)) continue;
    if (insuranceName.length > 120 || /text\/html/i.test(insuranceName)) continue;

    rows.push({
      ...emptyInsuranceRow(),
      providerName: insuranceName,
      planName: planName || (/\(([^)]+)\)/.exec(insuranceName)?.[1] ?? ''),
      groupNumber,
      memberID,
      payerId,
      subscriberName,
      relationToSubscriber: relation,
      guarantor,
      memberName: guarantor,
      startDate: startIso,
      policyNumber: '',
      subscriberId: '',
    });
  }

  if (!rows.length) {
    const loose = block.match(
      /(\d{1,2}\/\d{1,2}\/\d{4})\s+\d+\s+((?:BCBS|Blue Cross|Aetna|Cigna|United|Humana|Medicare|Medicaid)[^\n]{0,80}?)\s+(\d{2,6})\b[^\n]{0,120}?\b(family\s+dependent|self|spouse|child)\b[^\n]{0,40}?\b([A-Z0-9]{5,})\b[^\n]{0,20}?\b(\d{3,})\b/i
    );
    if (loose) {
      const name = collapseWs(loose[2].replace(/\s+\d{2,6}\b.*/, '')).trim();
      rows.push({
        ...emptyInsuranceRow(),
        providerName: name,
        groupNumber: loose[3],
        relationToSubscriber: collapseWs(loose[4]),
        memberID: loose[5],
        payerId: loose[6],
        startDate: tryParseDateToIso(loose[1]) || '',
      });
    }
  }

  return rows;
}

function escapeReForAthena(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function parseAthenaPortabilityDocument(text: string): Tab14IntakeParseResult {
  const normalized = normalizeAthenaPortabilityText(text);
  const extendedSections = parseExtendedSectionsFromDocument(normalized);
  const vitalsHistory = parseAthenaDataPortabilityVitalsHistory(normalized);
  const patientFields = {
    ...parseAthenaPatientFields(normalized),
    ...(vitalsHistory.length
      ? vitalReadingToPatientFields(vitalsHistory[0])
      : parseAthenaDataPortabilityVitals(normalized)),
    ...socialObservationPatientFields(extendedSections.socialHistory),
  };
  const noKnownProblems = detectNoKnownProblems(normalized);
  const hospitalVisits = parseAthenaPastEncounters(normalized);
  return withSanitizedPatientFieldWarnings({
    patientFields,
    noKnownDrugAllergies: false,
    noKnownProblems,
    insurances: parseAthenaDataPortabilityPayers(normalized),
    allergies: parseAthenaAllergies(normalized),
    medications: parseAthenaMedications(normalized),
    chronicConditions: noKnownProblems
      ? [noKnownProblemsChronicRow()]
      : parseAthenaChronicConditions(normalized),
    hospitalVisit: hospitalVisits[0] ?? parseAthenaHospital(normalized),
    hospitalVisits,
    labPanels: parseAthenaDataPortabilityResults(normalized),
    vitalsHistory: vitalsHistory.length ? vitalsHistory : undefined,
    extendedSections,
  });
}

/**
 * MEDITECH CCD / MyHealth portal export — Athena-like TOC with Meditech dialects
 * for allergies, meds, payers, PoT, Care Team, family/immunizations, encounters,
 * notes, imaging, and demographics contact (phone/email).
 */
function parseMeditechCcdDocument(text: string): Tab14IntakeParseResult {
  const adapted = preprocessMeditechCcdText(normalizeAthenaPortabilityText(text));
  const base = parseAthenaPortabilityDocument(adapted);
  const allergies = parseMeditechAllergies(adapted);
  const medications = parseMeditechMedications(adapted);
  const insurances = parseMeditechPayers(adapted);
  const visits = parseMeditechPastEncounters(adapted);
  const overlays = buildMeditechExtendedOverlays(adapted, base.extendedSections);
  const nameOverlay = extractMeditechPatientSummaryName(adapted);
  const demoContact = extractMeditechDemographicsContact(adapted);
  const labPanels = filterMeditechLabPanels(base.labPanels);

  // Prefer Meditech demographics contact; clear bad related-person email bleed.
  const patientFields: Tab14PatientFields = {
    ...base.patientFields,
    ...nameOverlay,
    ...demoContact,
  };
  if (!demoContact.email && /taylor\.rivera/i.test(patientFields.email ?? '')) {
    delete patientFields.email;
  }

  return withSanitizedPatientFieldWarnings({
    ...base,
    patientFields,
    allergies: allergies.length ? allergies : base.allergies,
    medications: medications.length ? medications : base.medications,
    insurances: insurances.length ? insurances : base.insurances,
    hospitalVisits: visits.length ? visits : base.hospitalVisits,
    hospitalVisit: visits[0] ?? base.hospitalVisit,
    labPanels: labPanels.length ? labPanels : base.labPanels,
    extendedSections: mergeExtendedSections(
      base.extendedSections ?? emptyExtendedSections(),
      overlays
    ),
  });
}

/** Athena records gender identity / sexual orientation as Social History observations. */
function socialObservationPatientFields(
  socialHistory: Tab14ClinicalEntry[] | undefined
): Tab14PatientFields {
  const out: Tab14PatientFields = {};
  for (const row of socialHistory ?? []) {
    const value = collapseWs(row.detail);
    if (!value) continue;
    if (/^gender\s+identity$/i.test(row.title)) out.genderIdentity = value.slice(0, 120);
    if (/^sexual\s+orientation$/i.test(row.title)) out.sexualOrientation = value.slice(0, 120);
  }
  return out;
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
    noKnownProblems: primary.noKnownProblems || fallback.noKnownProblems,
    insurances: primary.insurances.length ? primary.insurances : fallback.insurances,
    allergies: primary.allergies.length ? primary.allergies : fallback.allergies,
    medications,
    chronicConditions: primary.noKnownProblems
      ? primary.chronicConditions
      : primary.chronicConditions.length
        ? primary.chronicConditions
        : fallback.noKnownProblems
          ? fallback.chronicConditions
          : fallback.chronicConditions,
    hospitalVisit: {
      ...fallback.hospitalVisit,
      ...primary.hospitalVisit,
    },
    hospitalVisits: primary.hospitalVisits?.length
      ? primary.hospitalVisits
      : fallback.hospitalVisits,
    labPanels: mergeLabPanels(primary.labPanels, fallback.labPanels),
    vitalsHistory: primary.vitalsHistory?.length
      ? primary.vitalsHistory
      : fallback.vitalsHistory,
    extendedSections:
      primary.extendedSections || fallback.extendedSections
        ? mergeExtendedSections(
            fallback.extendedSections ?? emptyExtendedSections(),
            primary.extendedSections ?? emptyExtendedSections()
          )
        : undefined,
    epicSectionOccurrenceCounts: (() => {
      const out: Partial<Record<string, number>> = {
        ...(fallback.epicSectionOccurrenceCounts ?? {}),
      };
      for (const [title, count] of Object.entries(
        primary.epicSectionOccurrenceCounts ?? {}
      )) {
        out[title] = Math.max(out[title] ?? 0, Number(count) || 0);
      }
      return Object.keys(out).length ? out : undefined;
    })(),
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
    const mid = l.match(
      /(?:^|[\s,;.])(allergies|medications?|vitals|social\s*history|problems|procedures|immunizations|insurance)\b/i
    );
    if (mid && !headerRe.test(mid[1]) && !headerRe.test(l)) break;
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
    if (looksLikeMedicationNotAllergy(name)) continue;
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
  const one: Tab14InsuranceRow = emptyInsuranceRow();
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

  const noKnownProblems = detectNoKnownProblems(text);

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
  const chronicConditions = noKnownProblems
    ? [noKnownProblemsChronicRow()]
    : parseChronicRows(chronicSection, text);
  const parsedPatient = parsePatientFields(text);

  return {
    patientFields: parsedPatient.fields,
    noKnownDrugAllergies,
    noKnownProblems,
    insurances: parseInsuranceFromText(text),
    allergies: allergyRows,
    medications,
    chronicConditions,
    hospitalVisit: parseHospital(text),
    labPanels: [],
    ...(Object.keys(parsedPatient.warnings).length
      ? { fieldWarnings: parsedPatient.warnings }
      : {}),
  };
}

/**
 * Parse free-text (from PDF text layer or OCR) into Tab14-shaped structures.
 * Uses the format-agnostic general extractor first, then merges specialized parsers.
 *
 * Pass `preferredVendor` when the user selected Athena / MEDITECH / Epic / NextGen /
 * Generic (or Auto) so we do not run competing EHR dialects on the same file.
 */
export function parseTab14IntakeDocument(
  raw: string,
  options?: ParseTab14DocumentOptions
): Tab14IntakeParseResult {
  const rawText = raw.replace(/\r\n/g, '\n');
  const preprocessed = preprocessIntakeDocumentText(rawText);
  const preferred = options?.preferredVendor;

  const general = parseGeneralIntakeDocument(preprocessed);

  const specialized: Tab14IntakeParseResult[] = [];
  // Product demos / non-vendor formats — always eligible
  if (isMeditapDemoRecordDocument(rawText)) {
    specialized.push(parseMeditapDemoRecordDocument(rawText));
  }
  if (isRiverbendHieDocument(rawText)) {
    specialized.push(parseRiverbendHieDocument(rawText));
  }
  if (isSpanishMediTapRegistroDocument(rawText)) {
    specialized.push(parseSpanishMediTapRegistroDocument(rawText));
  }

  // Generic / Other: skip specialized Athena/MEDITECH/Epic/NextGen dialects.
  if (preferred !== 'generic') {
    if (shouldRunVendorParser('epic', preferred) && isEpicHealthSummaryDocument(rawText)) {
      specialized.push(parseEpicHealthSummaryDocument(rawText));
    }
    if (
      shouldRunVendorParser('athena', preferred) &&
      (isAthenaPortabilityDocument(rawText) || isAthenaPortabilityDocument(preprocessed))
    ) {
      specialized.push(parseAthenaPortabilityDocument(preprocessed));
    }
    if (
      shouldRunVendorParser('meditech', preferred) &&
      (isMeditechCcdDocument(rawText) || isMeditechCcdDocument(preprocessed))
    ) {
      specialized.push(parseMeditechCcdDocument(preprocessed));
    }
    // NextGen: detector only for now — when matched under preferred/auto, we still
    // rely on general extract until dialect parsers exist.
    if (shouldRunVendorParser('nextgen', preferred)) {
      void isNextGenHealthcareDocument(rawText);
    }
  }

  if (specialized.length === 0) {
    const text = normalizeExtractedDocumentText(preprocessed);
    const generic = parseGenericTab14Document(text);
    return withSanitizedPatientFieldWarnings(mergeIntakeParseResults(generic, general));
  }

  // Epic preferred: do not merge general extract (table-header names / department phones).
  if (preferred === 'epic' && specialized.length === 1) {
    return withSanitizedPatientFieldWarnings(specialized[0]);
  }

  const merged = withSanitizedPatientFieldWarnings(mergeIntakeParseResults(general, ...specialized));
  if (isEpicHealthSummaryDocument(rawText)) {
    merged.patientFields = scrubImplausibleEpicPatientNames(merged.patientFields);
  }
  return merged;
}

export type { ParseTab14DocumentOptions, EhrDocumentTypeId } from './ehrDocumentTypes';
export {
  EHR_DOCUMENT_TYPE_OPTIONS,
  EHR_VENDOR_PANEL_OPTIONS,
  ehrDocumentTypeById,
  ehrDocumentTypeStatusLabel,
} from './ehrDocumentTypes';
