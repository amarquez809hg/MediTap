/**
 * Display/write cleanup for clinical catalog names (conditions, hospitals).
 * Mirrors Patient Information sanitize: strip section bleed, dates, ICD noise,
 * and address tails so cards/modals show organized fields.
 */

import { tryParseDateToIso } from './intakeDateParse';

function collapseWs(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/** Compact / Athena / Epic section titles that glue into neighboring values. */
const SECTION_HEADERS = [
  'Chronic Conditions',
  'Active Problems',
  'Problem List',
  'Medications',
  'Allergies',
  'Insurance',
  'Care Team',
  'Demographics',
  'Laboratory Results',
  'Recent Hospital Visit',
  'Hospital Visit',
  'Vitals',
  'Immunizations',
  'Social History',
  'Encounter Details',
  'Past Encounters',
  'Notes',
] as const;

function unglueSectionHeaders(raw: string): string {
  let t = raw;
  for (const header of SECTION_HEADERS) {
    const esc = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // "Chronic ConditionsEssential" → "Chronic Conditions Essential"
    t = t.replace(new RegExp(`(${esc})(?=[A-Za-z0-9#(])`, 'gi'), '$1 ');
    // "Swelling Chronic Conditions" already spaced is fine
  }
  return collapseWs(t);
}

function cutAtSectionHeaders(raw: string, preferAfter?: string): string {
  const spaced = unglueSectionHeaders(raw);
  if (preferAfter) {
    const re = new RegExp(`${preferAfter.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+`, 'i');
    const m = spaced.match(re);
    if (m && m.index != null) {
      return collapseWs(spaced.slice(m.index + m[0].length));
    }
  }
  // Keep text before the next foreign section (e.g. cut trailing Medications…)
  let cut = spaced;
  for (const header of SECTION_HEADERS) {
    if (/^chronic\s+conditions$/i.test(header)) continue;
    const re = new RegExp(`\\s+${header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    const idx = cut.search(re);
    if (idx > 0) cut = cut.slice(0, idx);
  }
  return collapseWs(cut);
}

export type CleanedConditionName = {
  name: string;
  diagnosisDate: string;
  icdCode: string;
};

/**
 * Normalize a polluted condition / problem string into name + optional ICD + date.
 */
export function cleanConditionDisplayName(raw: string): CleanedConditionName {
  let text = collapseWs(raw || '');
  if (!text) return { name: '', diagnosisDate: '', icdCode: '' };

  text = unglueSectionHeaders(text);

  // Prefer the chronic segment when allergy/header bleed precedes it.
  if (/\bChronic\s+Conditions\b/i.test(text)) {
    text = cutAtSectionHeaders(text, 'Chronic Conditions');
  } else {
    text = cutAtSectionHeaders(text);
  }

  // Drop leading allergy-like "Shellfish – Swelling" only when another disease follows.
  // Handled by preferring after Chronic Conditions above.

  let diagnosisDate = '';
  let icdCode = '';

  // Name (ICD) – Diagnosed MM/DD/YYYY  OR  Name () – Diagnosed …
  const compact = text.match(
    /^(.+?)\s*\(([A-Z0-9.]*)\)\s*[–—-]\s*Diagnosed\s+(\d{1,2}\/\d{1,2}\/\d{4})\b/i
  );
  if (compact) {
    text = collapseWs(compact[1]);
    icdCode = (compact[2] || '').trim();
    diagnosisDate = tryParseDateToIso(compact[3]) || '';
  } else {
    const diagnosed = text.match(/\bDiagnosed\s+(\d{1,2}\/\d{1,2}\/\d{4})\b/i);
    if (diagnosed) {
      diagnosisDate = tryParseDateToIso(diagnosed[1]) || '';
      text = collapseWs(text.replace(/\s*[–—-]?\s*Diagnosed\s+\d{1,2}\/\d{1,2}\/\d{4}\b/i, ''));
    }
  }

  // Trailing "ICD-10 Active 01/09/2026" (or Inactive/Resolved)
  const statusTail = text.match(
    /\s+ICD-?10\s+(?:Active|Inactive|Resolved|Chronic)?\s*(\d{1,2}\/\d{1,2}\/\d{4})?\s*$/i
  );
  if (statusTail) {
    if (statusTail[1] && !diagnosisDate) {
      diagnosisDate = tryParseDateToIso(statusTail[1]) || '';
    }
    text = collapseWs(text.slice(0, statusTail.index));
  }

  // Trailing bare status + date
  const bareStatus = text.match(
    /\s+(?:Active|Inactive|Resolved)\s+(\d{1,2}\/\d{1,2}\/\d{4})\s*$/i
  );
  if (bareStatus) {
    if (!diagnosisDate) diagnosisDate = tryParseDateToIso(bareStatus[1]) || '';
    text = collapseWs(text.slice(0, bareStatus.index));
  }

  // Empty () left from missing ICD
  text = collapseWs(text.replace(/\(\s*\)/g, ''));

  // Strip glued leading section word if still present
  text = collapseWs(
    text.replace(/^(?:Chronic\s+Conditions|Active\s+Problems|Problem\s+List)\s+/i, '')
  );

  // Cap runaway visit-note titles but keep surgical "Status post …"
  if (text.length > 160) {
    text = collapseWs(text.slice(0, 160));
  }

  return { name: text, diagnosisDate, icdCode };
}

export type CleanedFacilityName = {
  name: string;
  city: string;
  region: string;
  postalCode: string;
  addressLine1: string;
};

/**
 * Normalize a polluted facility / hospital string into name + optional address parts.
 */
export function cleanFacilityDisplayName(raw: string): CleanedFacilityName {
  let text = collapseWs(raw || '');
  if (!text) {
    return { name: '', city: '', region: '', postalCode: '', addressLine1: '' };
  }

  // Leading clock / timezone crumbs: "PM EDT Emergency …"
  text = collapseWs(
    text.replace(/^(?:\d{1,2}:\d{2}\s*)?(?:AM|PM)\s+[A-Z]{2,5}\s+/i, '')
  );
  text = collapseWs(text.replace(/^(?:AM|PM)\s+[A-Z]{2,5}\s+/i, ''));

  // Drop leading visit-type word before facility (keep "Emergency Department" suffix later)
  text = collapseWs(
    text.replace(/^(?:Emergency|Inpatient|Outpatient|Observation)\s+(?=[A-Z])/i, '')
  );

  let city = '';
  let region = '';
  let postalCode = '';
  let addressLine1 = '';

  // Prefer "… Medical Center|Hospital … Emergency Department" as the name core
  const facility = text.match(
    /((?:[A-Z][A-Za-z'-]+(?:\s+[A-Z0-9][A-Za-z0-9'-]+){0,8})\s+(?:Medical Center|Hospital|Clinic|Health System|Medical Group)(?:\s+Emergency Department)?)/i
  );
  let name = facility ? collapseWs(facility[1]) : text;
  const afterFacility = facility
    ? collapseWs(text.slice((facility.index ?? 0) + facility[0].length))
    : '';

  // Remainder: "101 Dates Drive Ithaca, NY 14850"
  let tail = afterFacility || (facility ? '' : text);
  if (facility) {
    // already have name; parse address from afterFacility only
  } else {
    // Try to peel address from end of text when no facility keyword matched
    tail = text;
  }

  const cityZip = tail.match(/\b([A-Z][a-z]+),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/);
  if (cityZip) {
    city = cityZip[1];
    region = cityZip[2];
    postalCode = cityZip[3];
    tail = collapseWs(tail.slice(0, cityZip.index));
  }

  const street = tail.match(
    /^(\d{1,6}\s+[A-Za-z0-9 .'-]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Way|Court|Ct)\.?)\s*$/i
  );
  if (street) {
    addressLine1 = collapseWs(street[1]);
    tail = '';
  } else if (tail && /\d{1,6}\s+\w+/.test(tail)) {
    addressLine1 = tail;
    tail = '';
  }

  if (!facility && tail === '' && name === text) {
    // peeled city/street from name blob
    name = collapseWs(
      text
        .replace(
          /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*([A-Z]{2})\s+(\d{5}(?:-\d{4})?)\s*$/,
          ''
        )
        .replace(
          /\s+\d{1,6}\s+[A-Za-z0-9 .'-]+(?:Street|St|Avenue|Ave|Boulevard|Blvd|Road|Rd|Drive|Dr|Lane|Ln|Way|Court|Ct)\.?\s*$/i,
          ''
        )
    );
  }

  if (name.length > 120) {
    name = collapseWs(name.slice(0, 120));
  }

  return { name, city, region, postalCode, addressLine1 };
}

/** Athena / CCD section titles glued onto names (word-safe unglue — no short tokens like Ph). */
const DEMOGRAPHIC_UNGlue =
  'Demographics|Related\\s+Person|Care\\s+Team(?:\\s+Members)?|Assessment|Plan\\s+of\\s+Treatment|Reason\\s+for\\s+Referral|Results|Problems|Procedures|Medical\\s+Equipment|Allergies|Medications|Vitals|Social\\s+History|Functional\\s+Status|Mental\\s+Status|Family\\s+History|Medical\\s+History|Obstetrics\\s+History|Immunizations|Past\\s+Encounters|Advance\\s+Directives?|Payers|Notes|Table\\s+of\\s+Contents';

/** Field labels that start a foreign value — cut points after spacing. */
const DEMOGRAPHIC_CUT = `${DEMOGRAPHIC_UNGlue}|Preferred(?:\\s+Language)?|Marital\\s+status|Ethnicity|Race|DOB|Date\\s+of\\s+Birth|Previous\\s+Name|Contact|Address|Number|mailto|tel:|Email|Sex(?:\\s+at\\s+Birth)?|Goals|Health\\s+Concerns`;

/**
 * Truncate polluted demographic field values (warn-only is not enough once data is saved).
 */
export function cleanDemographicFieldValue(
  field: string,
  raw: string
): { value: string; changed: boolean } {
  const original = collapseWs(raw || '');
  if (!original) return { value: '', changed: false };

  let value = original
    // "JenningsDemographics" → "Jennings Demographics"
    .replace(new RegExp(`([A-Za-z])(?=${DEMOGRAPHIC_UNGlue}\\b)`, 'gi'), '$1 ');

  const cutAt = (re: RegExp) => {
    const m = value.match(re);
    if (m && m.index != null && m.index > 0) {
      value = collapseWs(value.slice(0, m.index));
    }
  };

  if (field === 'givenName' || field === 'familyName' || field === 'fullName') {
    cutAt(new RegExp(`\\s+(?:${DEMOGRAPHIC_CUT})\\b`, 'i'));
    value = collapseWs(
      value.replace(new RegExp(`^(?:${DEMOGRAPHIC_CUT})\\s+`, 'i'), '')
    );
    // Keep at most a few name tokens
    const tokens = value.split(/\s+/).filter(Boolean);
    if (tokens.length > 4) value = tokens.slice(0, 4).join(' ');
  } else if (field === 'phoneNumber') {
    const tel = value.match(
      /(?:tel:\+?1-?)?\(?(\d{3})\)?[\s.-]*(\d{3})[\s.-]*(\d{4})/
    );
    if (tel) {
      value = `(${tel[1]}) ${tel[2]}-${tel[3]}`;
    } else {
      cutAt(/\s+(?:mailto:|Address\s*:|Number\s*:|@)/i);
      value = collapseWs(value.replace(/^(?:Number|Phone|tel)\s*:?\s*/i, ''));
    }
  } else if (field === 'email') {
    const em =
      value.match(/mailto:([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i)?.[1] ||
      value.match(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i)?.[1];
    value = em ? em : '';
  } else if (field === 'address') {
    value = collapseWs(
      value
        .replace(/^(?:es|Address|Contact)\s*:?\s*/i, '')
        .replace(/\s*\((?:Current|Previous)\s+Billing\s+Address\).*$/i, '')
        .replace(/\s+Previous\b.*$/i, '')
    );
    // Prefer first street…ZIP,USA chunk
    const chunk = value.match(
      /(\d+[^,]*,\s*[A-Za-z .'-]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?(?:,\s*USA)?)/i
    );
    if (chunk) value = collapseWs(chunk[1]);
  } else if (field === 'race') {
    cutAt(
      /\s+(?:Preferred|Marital\s+status|Ethnicity|DOB|Date\s+of\s+Birth|Language)\b/i
    );
  } else if (field === 'ethnicity') {
    cutAt(/\s+(?:DOB|Date\s+of\s+Birth|Race|Preferred|Marital\s+status)\b/i);
  } else if (field === 'preferredLanguage') {
    cutAt(
      /\s+(?:Previous(?:\s+Name)?|Contact|Address|Marital|tel:|Ph\.?|Number|mailto)\b/i
    );
    // "Preferred English" → English
    value = collapseWs(value.replace(/^Preferred(?:\s+Language)?\s*/i, ''));
    const tokens = value.split(/\s+/).filter(Boolean);
    if (tokens.length > 2) value = tokens.slice(0, 2).join(' ');
  } else if (field === 'maritalStatus') {
    cutAt(/\s+(?:Preferred|Language|Previous|Contact|Race|Ethnicity)\b/i);
  }

  value = collapseWs(value);
  return { value, changed: value !== original };
}
