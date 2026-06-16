/**
 * Canonical intake field labels, section boundaries, and value validators.
 * Used by the format-agnostic general intake extractor.
 */

export function collapseWs(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

export function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Major section headers — values must not bleed across these. */
export const INTAKE_SECTION_HEADERS = [
  'PATIENT DEMOGRAPHICS',
  'DEMOGRAPHICS',
  'GROWTH DATA',
  'IMMUNIZATION HISTORY',
  'PROBLEMS',
  'MISSING FIELDS',
  'DIAGNOSIS',
  'PATHOLOGY SUMMARY',
  'CHEMOTHERAPY ADMINISTRATION',
  'LABS',
  'ECG REPORT',
  'ECHOCARDIOGRAM',
  'STRESS TEST',
  'MEDICATIONS',
  'ALLERGIES',
  'INSURANCE',
  'HOSPITAL VISIT',
  'CHRONIC CONDITIONS',
  'URGENT CARE',
  'DENTAL NOTE',
  'IMAGING',
  'OUTSIDE LAB',
  'DUPLICATE/CONFLICTING MED LISTS',
  'ENCOUNTER NOTE',
  'VITALS',
  'IMMUNIZATIONS',
  'SOCIAL HISTORY',
  'CARE TEAM',
  'NOTES',
  'Packet includes',
  'Table of Contents',
] as const;

export type DemographicFieldKey =
  | 'givenName'
  | 'familyName'
  | 'fullName'
  | 'dateOfBirth'
  | 'sexAtBirth'
  | 'bloodType'
  | 'email'
  | 'phoneNumber'
  | 'address'
  | 'race'
  | 'ethnicity'
  | 'preferredLanguage'
  | 'maritalStatus'
  | 'heightInches'
  | 'weightLbs';

export type DemographicLabelDef = {
  field: DemographicFieldKey;
  aliases: string[];
};

/** Longest aliases first when scanning (Child Name before Name). */
export const DEMOGRAPHIC_LABELS: DemographicLabelDef[] = [
  { field: 'givenName', aliases: ['Given Name', 'First Name'] },
  { field: 'familyName', aliases: ['Family Name', 'Last Name', 'Surname'] },
  { field: 'fullName', aliases: ['Patient Name', 'Full Name', 'Child Name', 'Name'] },
  { field: 'dateOfBirth', aliases: ['Date of Birth', 'Birth Date', 'DOB', 'Born'] },
  { field: 'sexAtBirth', aliases: ['Sex at Birth', 'Sex', 'Gender'] },
  { field: 'bloodType', aliases: ['Blood Type'] },
  { field: 'email', aliases: ['Email', 'E-mail'] },
  { field: 'phoneNumber', aliases: ['Phone Number', 'Phone', 'Mobile', 'Cell'] },
  { field: 'address', aliases: ['Address', 'Home Address', 'Street Address'] },
  { field: 'race', aliases: ['Race'] },
  { field: 'ethnicity', aliases: ['Ethnicity'] },
  { field: 'preferredLanguage', aliases: ['Preferred Language', 'Language'] },
  { field: 'maritalStatus', aliases: ['Marital Status'] },
  { field: 'heightInches', aliases: ['Height', 'Ht', 'Stature'] },
  { field: 'weightLbs', aliases: ['Weight', 'Wt', 'Body Weight'] },
];

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

const CLINICAL_NAME_NOISE =
  /\b(asthma|allerg|missing|fields|blood|type|phone|address|therapy|intermittent|seasonal|speech|referral|closed|growth|height|weight|percentile|insurance|guardian|school|immunization|problem|diagnosis|pathology|chemotherapy|medication|urgent|dental|imaging|encounter|facility|complaint|subjective|objective|assessment|plan|ordered|partial|scheduled|not listed|blank|redacted)\b/i;

const NAME_CHARS = /^[\p{L}''\-\s.]+$/u;

export function looksLikePersonName(value: string): boolean {
  const t = collapseWs(value);
  if (!t || t.length > 55) return false;
  if (CLINICAL_NAME_NOISE.test(t)) return false;
  if (/[.;!?]/.test(t)) return false;
  if (/\d/.test(t)) return false;
  if (t.split(/\s+/).length > 5) return false;
  return NAME_CHARS.test(t);
}

export function splitPersonName(full: string): { given?: string; family?: string } {
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

export function normalizeBloodType(text: string): string | undefined {
  const t = collapseWs(text).toUpperCase();
  for (const bt of ['AB+', 'AB-', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-'] as const) {
    if (t.includes(bt)) return bt;
  }
  const m = t.match(/\b(TYPE\s*)?(A|B|AB|O)\s*([+-])\b/);
  if (m) {
    const code = `${m[2]}${m[3]}`;
    if ((BLOOD_TYPES as readonly string[]).includes(code)) return code;
  }
  return undefined;
}

export function looksLikeBirthDate(iso: string): boolean {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const now = new Date();
  if (d > now) return false;
  if (d.getFullYear() < 1900) return false;
  return true;
}

export function isPlaceholderValue(value: string): boolean {
  return /^not listed|missing|redacted|blank|unknown|n\/a|none$/i.test(collapseWs(value));
}

export function validateDemographicValue(
  field: DemographicFieldKey,
  raw: string
): string | undefined {
  const v = collapseWs(raw);
  if (!v || isPlaceholderValue(v)) return undefined;

  switch (field) {
    case 'givenName':
    case 'familyName':
      return looksLikePersonName(v) ? v : undefined;
    case 'fullName':
      return looksLikePersonName(v) ? v : undefined;
    case 'dateOfBirth':
      return undefined; // validated separately with tryParseDateToIso
    case 'sexAtBirth': {
      const s = v.match(/^(male|female)\b/i);
      if (!s) return undefined;
      return s[1].charAt(0).toUpperCase() + s[1].slice(1).toLowerCase();
    }
    case 'bloodType':
      return normalizeBloodType(v);
    case 'email':
      return /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(v) ? v : undefined;
    case 'phoneNumber':
      return /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}/.test(v)
        ? v.replace(/\s+/g, ' ').trim()
        : undefined;
    case 'address':
      if (v.length < 5 || v.length > 200) return undefined;
      if (/^no full address\.?$/i.test(v)) return undefined;
      return v;
    case 'race':
    case 'ethnicity':
    case 'preferredLanguage':
    case 'maritalStatus':
      if (v.length < 2 || v.length > 80) return undefined;
      if (CLINICAL_NAME_NOISE.test(v)) return undefined;
      return v;
    case 'heightInches': {
      const ftIn = v.match(/(\d+)\s*['′]?\s*(\d+)\s*(?:in|"|'')?/);
      if (ftIn) {
        const total = Number(ftIn[1]) * 12 + Number(ftIn[2]);
        if (total > 0 && total <= 96) return String(total);
      }
      const inches = v.match(/(\d+(?:\.\d+)?)\s*(?:in|inches|"|'')?\b/i);
      if (inches) {
        const n = Number(inches[1]);
        if (n > 0 && n <= 96) return String(Math.round(n * 10) / 10);
      }
      const plain = v.match(/^(\d+(?:\.\d+)?)$/);
      if (plain) {
        const n = Number(plain[1]);
        if (n > 0 && n <= 96) return String(n);
      }
      return undefined;
    }
    case 'weightLbs': {
      const m = v.match(/(\d+(?:\.\d+)?)\s*(?:lb|lbs|pounds)?\b/i);
      if (m) {
        const n = Number(m[1]);
        if (n > 0 && n <= 999) return String(Math.round(n * 10) / 10);
      }
      return undefined;
    }
    default:
      return v;
  }
}

/** Build regex: label at boundary, value follows after colon or whitespace. */
export function labelMatchRegex(alias: string): RegExp {
  const esc = escapeRe(alias);
  if (/^name$/i.test(alias)) {
    return new RegExp(
      `(?:^|[\\n\\s])(?<!Given\\s)(?<!Family\\s)(?<!Full\\s)(?<!Child\\s)(?<!Patient\\s)(?<!Last\\s)(?<!First\\s)${esc}(?:\\s*[:#]\\s*|\\s+)`,
      'gi'
    );
  }
  return new RegExp(`(?:^|[\\n\\s])${esc}(?:\\s*[:#]\\s*|\\s+)`, 'gi');
}

/** End-of-demographics boundary — avoid matching inline words like "Insurance Missing". */
export const DEMOGRAPHICS_END =
  '\\b(?:GROWTH DATA|IMMUNIZATION HISTORY|PROBLEMS|MISSING FIELDS|DIAGNOSIS|PATHOLOGY|CHEMOTHERAPY|LABS|ECG REPORT|ECHOCARDIOGRAM|STRESS TEST|MEDICATIONS|ALLERGIES|INSURANCE\\s+(?:Information|Coverage|Plan|Provider|Details|Policy|Card|Section|\\d)|HOSPITAL VISIT|CHRONIC CONDITIONS|URGENT CARE|DENTAL NOTE|IMAGING|OUTSIDE LAB|DUPLICATE|ENCOUNTER NOTE|VITALS|Packet includes|Table of Contents)\\b';
