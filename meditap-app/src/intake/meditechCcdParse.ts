/**
 * MEDITECH MyHealth Continuity of Care Document (CCD) / portal data exports.
 *
 * TOC is Athena-like (Demographics → Notes · Care Team) but the banner is
 * "MEDITECH … CCD — Data Export" / "Patient Health Summary for …", not
 * "Data Portability for …". Keep this detector separate so Athena stays strict.
 *
 * Dialects that differ from Athena live here; shared TOC parsers are reused
 * via preprocess + Athena orchestration, then overlaid by these extractors.
 */

import { tryParseDateToIso } from './intakeDateParse';
import { collapseWs, splitPersonName } from './intakeFieldLabels';
import type {
  Tab14AllergyRow,
  Tab14HospitalFields,
  Tab14InsuranceRow,
  Tab14LabPanel,
  Tab14MedicationRow,
  Tab14PatientFields,
} from './tab14IntakeTypes';
import { emptyInsuranceRow } from './tab14IntakeTypes';
import type { Tab14ClinicalEntry, Tab14ExtendedSections } from './tab14PortabilitySections';
import { emptyClinicalEntry, emptyExtendedSections } from './tab14PortabilitySections';

function entry(
  partial: Partial<Tab14ClinicalEntry> & Pick<Tab14ClinicalEntry, 'title'>
): Tab14ClinicalEntry {
  return { ...emptyClinicalEntry(), ...partial };
}

function noneRecorded(detail: string): Tab14ClinicalEntry {
  return entry({ title: 'None recorded', detail });
}

export function isMeditechCcdDocument(text: string): boolean {
  const flat = collapseWs(text);
  if (!/MEDITECH/i.test(flat)) return false;
  return (
    /Continuity of Care Document|\bCCD\b|MyHealth Patient Portal/i.test(flat) &&
    /Patient Health Summary for/i.test(flat)
  );
}

/**
 * Structure tweaks so shared Athena TOC/section parsers can run on Meditech text
 * without loosening the Athena detector (caller injects / normalizes further).
 */
export function preprocessMeditechCcdText(text: string): string {
  let t = text.replace(/\r\n/g, '\n');
  t = t.replace(/Preferred\s*\n\s*language\s*:/gi, 'Preferred language:');
  t = t.replace(/(\d),(\d{3})\s*g\b/gi, '$1$2 g');
  t = t.replace(/Directive\s+N\s*:\s*Payers\b/gi, 'Directive\nPayers');
  t = t.replace(
    /([a-z.])\s*(Care\s+Team\s+Name\s+Role\s+Member\s+ID\s+NPI)/gi,
    '$1\n$2'
  );

  const name = t
    .match(/Patient\s+Health\s+Summary\s+for\s+([^(]+?)\s*\(/i)?.[1]
    ?.trim();
  if (name && !/data\s+portability\s+for/i.test(t)) {
    const clean = collapseWs(name).replace(/\s+Table\s+of\s+Contents.*$/i, '');
    t = `Data Portability for ${clean}\n${t}`;
  }
  return t;
}

export function extractMeditechPatientSummaryName(text: string): Tab14PatientFields {
  const out: Tab14PatientFields = {};
  const raw =
    text.match(/Patient\s+Health\s+Summary\s+for\s+([^(]+?)\s*\(/i)?.[1] ??
    text.match(/data\s+portability\s+for\s+([^\n]+)/i)?.[1];
  if (!raw) return out;
  const split = splitPersonName(
    collapseWs(raw).replace(/\s+Table\s+of\s+Contents.*$/i, '')
  );
  if (split.given) out.givenName = split.given;
  if (split.family) out.familyName = split.family;
  return out;
}

/** Demographics Contact only — avoid Related Person phone/email winning. */
export function extractMeditechDemographicsContact(text: string): Tab14PatientFields {
  const out: Tab14PatientFields = {};
  // Body demographics often follows TOC "... Care Team Demographics Sex:"
  const demo =
    text.match(
      /Demographics\s+Sex\s*:([\s\S]*?)(?=Related\s+Person\b|Care\s+Team\s+Members\b|Assessment\b)/i
    )?.[1] ??
    text.match(
      /(?:^|\n)\s*Demographics\b([\s\S]*?)(?=Related\s+Person\b|Care\s+Team\s+Members\b|Assessment\b)/i
    )?.[1] ??
    '';
  if (!demo) return out;

  // Prefer Contact: Ph. tel:… (Primary Home) over later Related Person phones
  const contactLine = demo.match(/\bContact\s*:[\s\S]*?(?=Other\s+Addresses\b|Related\s+Person\b|$)/i)?.[0] ?? demo;
  const tel =
    contactLine.match(/\btel:\+?1-?\(?(\d{3})\)?[\s.-]*(\d{3})[\s.-]*(\d{4})/i) ||
    contactLine.match(/\(?(\d{3})\)?[\s.-]*(\d{3})[\s.-]*(\d{4})/);
  if (tel) out.phoneNumber = `(${tel[1]}) ${tel[2]}-${tel[3]}`;

  const email = contactLine.match(/mailto:([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i)?.[1];
  if (email) out.email = email;

  const addr = demo.match(
    /\bContact:\s*(\d+[^,\n]+,\s*[A-Za-z .'-]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?(?:,\s*USA)?)/i
  );
  if (addr) out.address = collapseWs(addr[1]);

  return out;
}

export function parseMeditechAllergies(text: string): Tab14AllergyRow[] {
  const starts = [
    ...text.matchAll(
      /\ballergies\b[\s\S]{0,200}?allergen\s+name\s+allergen\s+category\s+reaction(?:\s+reaction)?\s+severity\s+criticality\s+documentation\s+date/gi
    ),
  ];
  const start = starts.length ? starts[starts.length - 1] : null;
  if (!start || start.index == null) return [];
  const from = start.index + start[0].length;
  const rest = text.slice(from);
  const endRel = rest.search(/\bmedications\b/i);
  const block = (endRel >= 0 ? rest.slice(0, endRel) : rest.slice(0, 900)).replace(/\n+/g, ' ');

  const rows: Tab14AllergyRow[] = [];
  const re =
    /\b([A-Za-z][A-Za-z0-9 /-]{1,40}?)\s+(medication|food|environment|drug|biologic)\s+([A-Za-z][A-Za-z /-]{1,40}?)\s+(Mild|Moderate|Severe|Not\s+available)\s+(High|Low|Unable\s+to\s+Assess|Unknown)\s+(\d{1,2}\/\d{1,2}\/\d{4})\b/gi;
  for (const m of block.matchAll(re)) {
    const name = collapseWs(m[1]);
    if (name.length < 2) continue;
    if (/^(allergen|category|reaction|severity|criticality|documentation)$/i.test(name)) continue;
    const cat = m[2].toLowerCase();
    const allergyType =
      cat === 'food'
        ? 'Food'
        : cat === 'environment'
          ? 'Environmental'
          : cat === 'medication' || cat === 'drug'
            ? 'Drug'
            : '';
    if (!rows.some((r) => r.allergyName.toLowerCase() === name.toLowerCase())) {
      rows.push({
        allergyName: name,
        allergyType,
        allergyTypeOther: '',
        severity: m[4],
        reactionNotes: collapseWs(m[3]),
        lastObserved: tryParseDateToIso(m[6]) || m[6],
        allergenId: '',
        category: cat,
        criticality: collapseWs(m[5]),
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

export function parseMeditechMedications(text: string): Tab14MedicationRow[] {
  const starts = [
    ...text.matchAll(/\bmedications\b[\s\S]{0,100}?name\s+sig\s+start\s+date\s+status/gi),
  ];
  const start = starts.length ? starts[starts.length - 1] : null;
  if (!start || start.index == null) return [];
  const from = start.index + start[0].length;
  const rest = text.slice(from);
  const endRel = rest.search(/\bvitals\b|\bsocial\s+history\b/i);
  const block = (endRel >= 0 ? rest.slice(0, endRel) : rest.slice(0, 5000)).replace(/\n+/g, '\n').trim();

  const rows: Tab14MedicationRow[] = [];
  const re =
    /([A-Za-z][A-Za-z0-9 ()/.-]*?)\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|g|unit)s?\b[^\n]*?)\s+((?:Take|Inhale|Apply|Inject|Instill)\s+[\s\S]*?)\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(active|inactive|completed)\s+([A-Za-z][A-Za-z /-]{1,60})(?=\s+[A-Za-z]|\s*$)/gi;

  for (const m of block.matchAll(re)) {
    const genericName = collapseWs(m[1]);
    if (genericName.length < 3) continue;
    if (/^(name|sig|start|status|indication|vitals)$/i.test(genericName)) continue;
    const strength = collapseWs(m[2]).match(/(\d+(?:\.\d+)?\s*(?:mg|mcg|g|unit)s?\b)/i)?.[1] ?? '';
    const sig = collapseWs(m[3]).replace(/\.\s*$/, '');
    const freqM = sig.match(
      /\b(once\s+daily|twice\s+daily|three\s+times\s+daily|every\s+\d+(?:-\d+)?\s+hours|daily|as\s+needed|nightly|at\s+bedtime)\b/i
    );
    const routeM = sig.match(/\b(by\s+mouth|oral|topical|intramuscular|subcutaneous|inhaled|inhale)\b/i);
    rows.push({
      genericName,
      brandName: '',
      dosage: strength,
      route: routeM ? routeM[1] : '',
      frequency: freqM ? freqM[1] : '',
      startDate: tryParseDateToIso(m[4]) || m[4],
      endDate: '',
      purpose: collapseWs(m[6]),
      prescribingPhysician: '',
      notesMedication: sig,
      sig,
      status: m[5].replace(/^./, (c) => c.toUpperCase()),
      authoredOn: tryParseDateToIso(m[4]) || m[4],
      fillQuantity: '',
      recordedBy: '',
      organization: '',
      recordedTime: '',
    });
  }
  return rows;
}

export function parseMeditechPayers(text: string): Tab14InsuranceRow[] {
  const starts = [
    ...text.matchAll(/\bPayers\b[\s\S]{0,160}?Insurance\s+Date\s+Sequence\s+Insurance\s+Name/gi),
  ];
  const start = starts.length ? starts[starts.length - 1] : null;
  if (!start || start.index == null) return [];
  const from = start.index + start[0].length;
  const rest = text.slice(from);
  const endRel = rest.search(/\bNotes\s+Date\s+Note\b|\bCare\s+Team\s+Name\s+Role\b/i);
  const block = (endRel >= 0 ? rest.slice(0, endRel) : rest.slice(0, 900)).replace(/\n+/g, ' ');

  const rows: Tab14InsuranceRow[] = [];
  const re =
    /(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d+)\s+([A-Za-z][A-Za-z0-9 .'-]*?(?:PPO|HMO|EPO|POS)?)\s+(\d{3,8})\s+([A-Za-z][A-Za-z .'-]{1,60}?)\s+(self|spouse|child|other|family\s+dependent|subscriber)\s+([A-Z0-9]{6,})\s+([A-Za-z][A-Za-z .'-]{1,60})/gi;

  for (const m of block.matchAll(re)) {
    const providerName = collapseWs(m[3]);
    if (providerName.length < 3 || providerName.length > 120) continue;
    if (/SAMPLE\s*\/\s*SYNTHETIC|Insurance Name|Group Identifier/i.test(providerName)) continue;
    rows.push({
      ...emptyInsuranceRow(),
      providerName,
      planName: /\b(PPO|HMO|EPO|POS)\b/i.exec(providerName)?.[1] ?? '',
      groupNumber: m[4].trim(),
      memberName: collapseWs(m[5]),
      guarantor: collapseWs(m[8]),
      relationToSubscriber: collapseWs(m[6]),
      memberID: m[7].trim(),
      subscriberName: collapseWs(m[5]),
      startDate: tryParseDateToIso(m[1]) || m[1],
    });
  }
  return rows;
}

/**
 * Plan of Treatment — Reminders / Order / Date / Provider / Organization Details.
 *
 * Org lines often contain "Diagnostics Lab" / "Hospital Lab". Those must not start a
 * new order (that produced titles like ", 2100 S Lamar… Lab free T4").
 */
export function parseMeditechPlanOfTreatment(text: string): Tab14ClinicalEntry[] {
  // Prefer body header (skip TOC "Plan of Treatment · Reason…")
  const starts = [...text.matchAll(/Plan\s+of\s+Treatment\s+Reminders\s+Order\s+Date/gi)];
  const hit = starts.length ? starts[starts.length - 1] : null;
  if (!hit || hit.index == null) return [];
  const rest = text.slice(hit.index);
  const endRel = rest.search(/\bReason\s+for\s+Referral\b|\bResults\s+Created\b/i);
  let block = endRel >= 0 ? rest.slice(0, endRel) : rest.slice(0, 3500);
  block = collapseWs(block)
    .replace(/MedicationOrders/gi, ' MedicationOrders ')
    // Protect org phrases that contain Lab so they are not order anchors
    .replace(/\bGeneral\s+Hospital\s+Lab\b/gi, 'General_Hospital_Lab')
    .replace(/\bHospital\s+Lab\b/gi, 'Hospital_Lab')
    .replace(/\bDiagnostics\s+Lab\b/gi, 'Diagnostics_Lab');

  const rows: Tab14ClinicalEntry[] = [];
  const seen = new Set<string>();
  const orderRe =
    /\b(Lab|Imaging|MedicationOrders)\s+(.+?)\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+?)(?=\s+(?:Lab|Imaging|MedicationOrders)\b|\s+Reason\s+for\s+Referral\b|$)/gi;

  for (const m of block.matchAll(orderRe)) {
    const reminders = m[1];
    const orderName = collapseWs(m[2])
      .replace(/\s+/g, ' ')
      .replace(/,\s*$/, '')
      .replace(/_/g, ' ')
      .slice(0, 160);
    if (!orderName || /^(reminders|order|date|provider|organization|details)$/i.test(orderName)) {
      continue;
    }
    // Reject address bleed that slipped through
    if (/^\d{2,5}\s/.test(orderName) || /^,\s*\d/.test(orderName)) continue;
    if (/\b(Blvd|Avenue|Ave\.?|Street)\b/i.test(orderName) && orderName.length > 40) continue;

    const date = m[3];
    const tail = collapseWs(m[4]).replace(/_/g, ' ');
    const provider =
      tail.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+(?:,?\s*MD)?)/)?.[1] ?? '';
    const instructions = /Take\s+|Inhale\s+/i.test(tail)
      ? (tail.match(/(?:Take|Inhale)\s+[\s\S]+$/i)?.[0] ?? '')
      : '';
    const organization = collapseWs(
      tail
        .replace(provider, '')
        .replace(/^[,.\s]+/, '')
        .replace(/\bTake\s+.+$/i, '')
        .replace(/\bInhale\s+.+$/i, '')
        .trim()
    );
    // Reminders column: Lab | Imaging | MedicationOrders (keep Medication alias for older UI)
    const category = /Medication/i.test(reminders)
      ? 'MedicationOrders'
      : /Imaging/i.test(reminders)
        ? 'Imaging'
        : 'Lab';
    const key = `${category}|${orderName}|${date}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const iso = tryParseDateToIso(date) || date;
    rows.push(
      entry({
        title: orderName,
        detail: '',
        date: iso,
        orderDate: iso,
        category,
        instructions: collapseWs(instructions).slice(0, 300),
        recordedBy: provider,
        performer: provider,
        place: organization.slice(0, 240),
        location: organization.slice(0, 240),
        notes: '',
      })
    );
  }
  return rows;
}

export function parseMeditechCareTeam(text: string): Tab14ClinicalEntry[] {
  const starts = [
    ...text.matchAll(/Care\s+Team\s+Name\s+Role\s+Member\s+ID\s+NPI\s+Specialty\s+Address\s+Phone/gi),
  ];
  const start = starts.length ? starts[starts.length - 1] : null;
  if (!start || start.index == null) return [];
  const flat = collapseWs(text.slice(start.index + start[0].length).replace(/\n+/g, ' '));

  const rows: Tab14ClinicalEntry[] = [];
  const role =
    'Primary Care Provider|Consulting Physician|Nurse Practitioner|Physician Assistant|Care Manager|Specialist(?:\\s*-\\s*[A-Za-z ]+)?';
  const re = new RegExp(
    `([A-Z][A-Z0-9 .'-]{2,60}?(?:\\s+(?:MD|DO|NP|PA|RN))?)\\s+(${role})\\s+(\\d{3,6})\\s+(\\d{8,12})\\s+([A-Za-z][A-Za-z /&-]{2,40}?)\\s+(\\d{2,5}\\s+[A-Za-z0-9 .,'/-]{5,80}?)\\s*((?:\\+?1[-.\\s]*)?\\(?\\d{3}\\)?[-.\\s]*\\d{3}[-.\\s]*\\d{0,4})?`,
    'g'
  );
  for (const m of flat.matchAll(re)) {
    const title = collapseWs(m[1]);
    if (/^(name|role|member|npi|specialty)$/i.test(title)) continue;
    const phone = collapseWs(m[7] ?? '').replace(/-$/, '');
    const addr = collapseWs(m[6]).replace(/,\s*/g, ', ').replace(/,\s*$/, '');
    rows.push(
      entry({
        title,
        detail: '',
        notes: 'Care Team',
        role: collapseWs(m[2]),
        memberId: m[3],
        npi: m[4],
        specialty: collapseWs(m[5]),
        phone,
        address: addr,
      })
    );
  }
  return rows;
}

export function parseMeditechFamilyHistory(text: string): Tab14ClinicalEntry[] {
  const start = text.search(/Family\s+History\s+Relationship\s+Description/i);
  if (start < 0) return [];
  const rest = text.slice(start);
  const endRel = rest.search(/\bMedical\s+History\s+Condition\b/i);
  const block = (endRel >= 0 ? rest.slice(0, endRel) : rest.slice(0, 800)).replace(/\n+/g, '\n');

  const rows: Tab14ClinicalEntry[] = [];
  const re =
    /\b(Father|Mother|Brother|Sister|Son|Daughter|Maternal\s+Grand\w+|Paternal\s+Grand\w+|Uncle|Aunt)\s+([A-Za-z0-9][A-Za-z0-9 /-]{1,80}?)\s+((?:Riverside\s+General\s+Hospital|[A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,4}\s+Hospital))/gi;

  for (const m of block.matchAll(re)) {
    const relationship = collapseWs(m[1]);
    const description = collapseWs(m[2]);
    if (/^(description|notes|organization)$/i.test(description)) continue;
    rows.push(
      entry({
        title: description.slice(0, 160),
        detail: relationship,
        relationship,
        place: collapseWs(m[3]).slice(0, 120),
      })
    );
  }
  return rows;
}

export function parseMeditechImmunizations(text: string): Tab14ClinicalEntry[] {
  const start = text.search(/Immunizations\s+Vaccine\s+Type\s+Date\s+Status/i);
  if (start < 0) return [];
  const rest = text.slice(start);
  const endRel = rest.search(/\bPast\s+Encounters\b/i);
  const block = (endRel >= 0 ? rest.slice(0, endRel) : rest.slice(0, 1200)).replace(
    /Vaccine\s+Type\s+Date\s+Status(?:\s+Organization\s+Details)?/i,
    ''
  );

  const rows: Tab14ClinicalEntry[] = [];
  const re =
    /([A-Za-z][A-Za-z0-9 ,/+()-]{2,80}?)\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(active|completed|inactive|refused)\s+([A-Za-z][A-Za-z0-9 .'-]{2,80})/gi;

  for (const m of block.matchAll(re)) {
    const title = collapseWs(m[1]);
    if (/^(vaccine|type|immunizations)$/i.test(title)) continue;
    rows.push(
      entry({
        title: title.slice(0, 160),
        detail: m[3].toLowerCase(),
        status: m[3].toLowerCase(),
        date: tryParseDateToIso(m[2]) || m[2],
        place: collapseWs(m[4]).slice(0, 120),
      })
    );
  }
  return rows;
}

export function parseMeditechPastEncounters(text: string): Tab14HospitalFields[] {
  const start = text.search(/Past\s+Encounters\s+Encounter\s+ID/i);
  if (start < 0) return [];
  const rest = text.slice(start);
  const endRel = rest.search(/\bGoals(?:\s+Section)?\b|\bHealth\s+Concerns\b|\bPayers\b/i);
  const block = (endRel >= 0 ? rest.slice(0, endRel) : rest.slice(0, 2000)).replace(/\n+/g, '\n');

  const visits: Tab14HospitalFields[] = [];
  const re =
    /(\d{7,9})\s+(OFFICE\/OUTPT\s+(?:EST|NEW)\s+PATIENT|[A-Z][A-Z0-9 /-:]{3,40})\s+([A-Z][a-z]+(?:\s+[A-Z][a-z']+)+(?:,?\s*MD)?)\s+([A-Za-z][A-Za-z0-9 .,'-]{4,80}?)\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(.+?)(?=\s+\d{7,9}\s+|Goals|$)/gi;

  for (const m of block.matchAll(re)) {
    const iso = tryParseDateToIso(m[5]) || m[5];
    const physician = collapseWs(m[3]).replace(/,\s*MD$/i, ', MD');
    const location = collapseWs(m[4]);
    visits.push({
      encounterId: m[1],
      reportId: m[1],
      visitType: collapseWs(m[2]),
      attendingPhysician: physician,
      facilityName: location,
      location,
      visitDate: iso,
      startDateTime: m[5],
      reason: collapseWs(m[6])
        .replace(/\s+Goals.*$/i, '')
        .replace(/;?\s*Hyperlipid$/i, '; Hyperlipidemia')
        .slice(0, 300),
    });
  }
  return visits;
}

export function parseMeditechImagingResults(text: string): Tab14ClinicalEntry[] {
  const start = text.search(/Imaging\s+Results\s+Imaging\s+Date\s+Name\s+Status/i);
  if (start < 0) return [];
  const rest = text.slice(start);
  const endRel = rest.search(/\bMedical\s+Equipment\b|\bAllergies\b/i);
  const block = (endRel >= 0 ? rest.slice(0, endRel) : rest.slice(0, 600)).replace(
    /Imaging\s+Results\s+Imaging\s+Date\s+Name\s+Status(?:\s+Organization\s+Details)?/i,
    ''
  );

  const rows: Tab14ClinicalEntry[] = [];
  const re =
    /(\d{1,2}\/\d{1,2}\/\d{4})\s+([A-Za-z][A-Za-z0-9 ,/-]{2,80}?)\s+(completed|preliminary|final)\s+([A-Za-z][\s\S]*?)(?=\d{1,2}\/\d{1,2}\/\d{4}\s+[A-Za-z]|$)/gi;

  for (const m of block.matchAll(re)) {
    const title = collapseWs(m[2]);
    if (/^(name|status|organization)$/i.test(title)) continue;
    rows.push(
      entry({
        title,
        detail: `Status: ${m[3]}\nPlace: ${collapseWs(m[4]).slice(0, 160)}`,
        date: tryParseDateToIso(m[1]) || m[1],
        status: m[3],
        place: collapseWs(m[4]).slice(0, 160),
        notes: 'Imaging Results',
      })
    );
  }
  return rows;
}

export function parseMeditechNotes(text: string): Tab14ClinicalEntry[] {
  const start = text.search(/\bNotes\s+Date\s+Note\s+Type\s+Note\s+Provider\s+Name/i);
  if (start < 0) return [];
  const rest = text.slice(start);
  const endRel = rest.search(/\bCare\s+Team\s+Name\s+Role\b/i);
  const block = endRel >= 0 ? rest.slice(0, endRel) : rest.slice(0, 3000);

  const rows: Tab14ClinicalEntry[] = [];
  const chunks = block.split(/(?=\d{1,2}\/\d{1,2}\/\d{4}\s+(?:text|application)\/)/i);
  for (const chunk of chunks) {
    const m = chunk.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s+((?:text|application)\/[\w.+-]+)\s+([\s\S]+)/i);
    if (!m) continue;
    let body = collapseWs(m[3]);
    const provider =
      body.match(/\b([A-Z][a-z]+\s+[A-Z][a-z]+,\s*MD)\b/)?.[1] ??
      body.match(/\b(Susan\s+Whitfield(?:,\s*MD)?)\b/i)?.[1] ??
      '';
    body = body.replace(/\b[A-Z][a-z]+\s+[A-Z][a-z]+,\s*MD\b/g, ' ').replace(/\s+/g, ' ').trim();
    if (body.length < 20) continue;
    const title = body.split(/[.!?]/)[0]?.slice(0, 80) || 'Clinical note';
    rows.push(
      entry({
        title,
        detail: body.slice(0, 800),
        date: tryParseDateToIso(m[1]) || m[1],
        recordedBy: provider,
        notes: m[2],
      })
    );
  }
  return rows;
}

function stripOrgSuffix(value: string): string {
  return collapseWs(value)
    .replace(/\s+Riverside General Hospital\s*$/i, '')
    .replace(/\s+Sample Health.*$/i, '')
    .trim();
}

export function cleanMeditechQaEntries(rows: Tab14ClinicalEntry[] | undefined): Tab14ClinicalEntry[] {
  return (rows ?? [])
    .filter(
      (r) =>
        !/·/.test(r.detail || '') &&
        !/^(Functional Status|Social History|Mental Status|Goals|Health Concerns|Reason for Referral|Plan of Treatment|Family History|Immunizations)$/i.test(
          r.title
        )
    )
    .map((r) => ({
      ...r,
      detail: stripOrgSuffix(r.detail || ''),
      place:
        r.place ||
        (/Riverside/i.test(r.detail || '') ? 'Riverside General Hospital' : r.place),
    }))
    .filter((r) => r.title.trim().length >= 3);
}

export function filterMeditechLabPanels(panels: Tab14LabPanel[]): Tab14LabPanel[] {
  return panels.filter((p) => {
    if (p.category === 'imaging') return true;
    if (/x-?ray|impression|chest/i.test(p.testName)) return false;
    if (p.components.some((c) => /impression|x-?ray/i.test(`${c.name} ${c.textValue ?? ''}`))) {
      return false;
    }
    return true;
  });
}

export function buildMeditechExtendedOverlays(
  text: string,
  base: Tab14ExtendedSections | undefined
): Tab14ExtendedSections {
  const out = emptyExtendedSections();
  const pot = parseMeditechPlanOfTreatment(text);
  if (pot.length) out.planOfTreatment = pot;

  const care = parseMeditechCareTeam(text);
  if (care.length) out.careTeam = care;

  const family = parseMeditechFamilyHistory(text);
  if (family.length) out.familyHistory = family;

  const shots = parseMeditechImmunizations(text);
  if (shots.length) out.immunizations = shots;

  const imaging = parseMeditechImagingResults(text);
  if (imaging.length) out.imagingResults = imaging;

  const notes = parseMeditechNotes(text);
  if (notes.length) out.notes = notes;

  const social = cleanMeditechQaEntries(base?.socialHistory);
  if (social.length) out.socialHistory = social;

  const functional = cleanMeditechQaEntries(base?.functionalStatus);
  if (functional.length) out.functionalStatus = functional;

  const mental = cleanMeditechQaEntries(base?.mentalStatus);
  if (mental.length) out.mentalStatus = mental;

  out.reasonForReferral = [noneRecorded('None Reported.')];
  out.goals = [noneRecorded('None Recorded')];
  out.healthConcerns = [noneRecorded('None Recorded')];
  out.medicalEquipment = [noneRecorded('None Reported.')];
  out.patientInstructions = [noneRecorded('Not present in MEDITECH CCD export.')];

  if (/No assessment recorded/i.test(text)) {
    out.assessment = [noneRecorded('No assessment recorded.')];
  }

  return out;
}
