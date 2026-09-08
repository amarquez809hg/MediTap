/**
 * Epic My Health Summary (Mayo / large Continuity export) — Jane Doe dialect.
 *
 * Canonical markers (prefer global snapshot, not encounter-embedded copies):
 *   `Allergies - as of MM/DD/YYYY`
 *   `Medications - as of …`
 *   `Active Problems - as of …`
 *   `Encounters - as of …`
 *   `Plan of Treatment - as of …` (often `Not on file`)
 *   `Procedures - as of …`
 *   `Results - as of …`
 *   `Last Filed Vital Signs - as of …`
 *
 * Cover/demographics pages are often image-only (no patient name/DOB in text layer).
 */

import { tryParseDateToIso } from './intakeDateParse';
import { collapseWs } from './intakeFieldLabels';
import {
  EPIC_MY_HEALTH_SUMMARY_TOC,
  collectEpicSectionBodies,
  pickEpicSectionBodies,
  sliceAllEpicResultsSessions,
  sliceEpicEncounterDetailSessions,
} from './epicMyHealthSummaryToc';
import {
  buildEpicDemographicsOccurrenceList,
  estimateEpicPatientDemographicsOccurrenceCount,
  parseEpicPatientDemographicsBody,
  pickPrimaryEpicPatientDemographicsFields,
  recoverSparseEpicDemographicsFields,
  sliceEpicPatientDemographicsSessions,
} from './epicPatientDemographics';
import { inventoryEpicNoteFromClinic } from './epicNoteFromClinic';
import type {
  Tab14AllergyRow,
  Tab14ChronicRow,
  Tab14HospitalFields,
  Tab14LabComponent,
  Tab14LabPanel,
  Tab14MedicationRow,
  Tab14PatientFields,
  Tab14VitalReading,
} from './tab14IntakeTypes';
import type { Tab14ClinicalEntry, Tab14ExtendedSections } from './tab14PortabilitySections';
import {
  emptyClinicalEntry,
  emptyExtendedSections,
} from './tab14PortabilitySections';


/** Repair common Epic PDF text-layer glue: `tabletTake`, `SigDispense`, `mgtablet`. */
function deglueEpicPdfText(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/(\d)([A-Za-z])/g, '$1 $2')
    .replace(/([A-Za-z])(\d)/g, '$1 $2')
    .replace(/\bSigDispense\b/gi, 'Sig Dispense')
    .replace(/\btabletTake\b/gi, 'tablet Take')
    .replace(/\bcapsuleTake\b/gi, 'capsule Take');
}

function entry(
  partial: Partial<Tab14ClinicalEntry> & Pick<Tab14ClinicalEntry, 'title'>
): Tab14ClinicalEntry {
  return { ...emptyClinicalEntry(), ...partial };
}

function noneRecorded(detail: string): Tab14ClinicalEntry {
  return entry({ title: 'None recorded', detail });
}

/** True for Mayo-style My Health Summary with dated snapshot sections. */
export function isEpicMayoMyHealthSummaryDocument(text: string): boolean {
  const flat = collapseWs(text);
  const asOf =
    /Allergies\s*-\s*as of\s+\d{1,2}\/\d{1,2}\/\d{4}/i.test(flat) ||
    /Active Problems\s*-\s*as of\s+\d{1,2}\/\d{1,2}\/\d{4}/i.test(flat) ||
    /Encounters\s*-\s*as of\s+\d{1,2}\/\d{1,2}\/\d{4}/i.test(flat);
  const mayoFlavor =
    /Last Filed Vital Signs/i.test(flat) ||
    /Active Allergy Reactions\s+Criticality/i.test(flat) ||
    /Mayo Clinic/i.test(flat) ||
    /Medication SigDispense/i.test(flat);
  return asOf && mayoFlavor;
}

const NEXT_AS_OF =
  /(?=\s*(?:Encounters|Allergies|Medications|Active Problems|Immunizations|Social History|Last Filed Vital Signs|Plan of Treatment|Procedures|Results|Notes)\s*-\s*as of\s+\d{1,2}\/\d{1,2}\/\d{4}\b)/i;

/**
 * Prefer the best global `Section - as of DATE` body for a TOC title.
 * Uses the shared Epic TOC indexer (same multi-hit model as Encounter Details).
 * Falls back to legacy first-as-of slicing when the indexer finds no hit.
 */
/**
 * Prefer the shared TOC multi-hit corpus (same model as Encounters).
 * Returns the joined bodies so legacy single-block callers still work;
 * new parsers should use `collectEpicMayoSectionBodies` / `collectEpicSectionBodies`.
 */
export function sliceEpicMayoAsOfSection(text: string, sectionTitle: string): string {
  const bodies = collectEpicMayoSectionBodies(text, sectionTitle);
  if (bodies.length > 0) return bodies.join('\n\n');

  const startRe = new RegExp(
    `${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*-\\s*as of\\s+(\\d{1,2}\\/\\d{1,2}\\/\\d{4})`,
    'i'
  );
  const m = text.match(startRe);
  if (!m || m.index == null) return '';
  const rest = text.slice(m.index);
  const end = rest.slice(m[0].length).search(NEXT_AS_OF);
  return end >= 0 ? rest.slice(0, m[0].length + end) : rest.slice(0, Math.min(rest.length, 120_000));
}

/** Section-body collector — Encounters-style inventory for every Epic TOC title. */
export function collectEpicMayoSectionBodies(
  text: string,
  sectionTitle: string,
  opts?: Parameters<typeof collectEpicSectionBodies>[2]
): string[] {
  const bodies = collectEpicSectionBodies(text, sectionTitle, opts);
  if (bodies.length > 0) return bodies;
  // Legacy first-as-of fallback when indexer finds nothing
  const startRe = new RegExp(
    `${sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*-\\s*as of\\s+(\\d{1,2}\\/\\d{1,2}\\/\\d{4})`,
    'i'
  );
  const m = text.match(startRe);
  if (!m || m.index == null) return [];
  const rest = text.slice(m.index);
  const end = rest.slice(m[0].length).search(NEXT_AS_OF);
  const body =
    end >= 0 ? rest.slice(0, m[0].length + end) : rest.slice(0, Math.min(rest.length, 120_000));
  return body.trim() ? [body] : [];
}

/**
 * Build a labeled corpus of every established Epic TOC section (debug / compact views).
 * Prefer `preprocessEpicMayoMyHealthSummaryText` for parse — that keeps the full extract.
 */
export function buildEpicMayoSectionCorpus(raw: string): string {
  const text = raw.replace(/\r\n/g, '\n');
  if (!isEpicMayoMyHealthSummaryDocument(text)) return text;

  const chunks: string[] = [];
  const seen = new Set<string>();
  const push = (body: string, label?: string) => {
    const trimmed = body.trim();
    if (trimmed.length < 20) return;
    const key = trimmed.slice(0, 180).toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    chunks.push(label ? `--- ${label} ---\n${trimmed}` : trimmed);
  };

  push(text.slice(0, Math.min(30_000, text.length)), 'cover');

  for (const entry of EPIC_MY_HEALTH_SUMMARY_TOC) {
    const maxAsOf = entry.title === 'Results' || entry.title === 'Encounter Details' ? 40 : 20;
    const maxLocal =
      entry.title === 'Medications' ||
      entry.title === 'Allergies' ||
      entry.title === 'Active Problems'
        ? 20
        : entry.title === 'Results' || entry.title === 'Encounter Details'
          ? 5
          : 12;
    for (const body of collectEpicSectionBodies(text, entry.title, {
      maxAsOf,
      maxEncounterLocal: maxLocal,
      includeEncounterLocal: true,
    })) {
      push(body, entry.title);
    }
  }

  const encAsOf = text.search(/Encounters\s*-\s*as of\s+\d{1,2}\/\d{1,2}\/\d{4}/i);
  if (encAsOf >= 0) {
    const rest = text.slice(encAsOf);
    const end = rest.slice(0, 80_000).search(
      /\n(?=Allergies\s*-\s*as of|Medications\s*-\s*as of|Active Problems\s*-\s*as of|Results\s*-\s*as of|Immunizations\s*-\s*as of)\b/i
    );
    push(end > 0 ? rest.slice(0, end) : rest.slice(0, 80_000), 'Encounters - as of');
  }

  for (const session of sliceEpicEncounterDetailSessions(text).slice(0, 40)) {
    push(session.body, `Encounter Details #${session.index + 1}`);
  }
  for (const session of sliceAllEpicResultsSessions(text).slice(0, 40)) {
    push(session.body, `Results ${session.asOf || ''}`.trim());
  }

  const joined = chunks.join('\n\n');
  const CAP = 900_000;
  return joined.length <= CAP ? joined : `${joined.slice(0, CAP)}\n\n/* …corpus truncated for memory… */`;
}

/**
 * Normalize Mayo Continuity extracts without dropping later section inventories.
 * Yellow TOC titles are often image-only — truncation previously hid `Section - as of`
 * blocks the same way sparse Encounter Details hid the Encounters table.
 */
export function preprocessEpicMayoMyHealthSummaryText(raw: string): string {
  return raw.replace(/\r\n/g, '\n');
}

/**
 * Mayo Epic cover / Patient Demographics banner (often OCR'd from image page 1):
 *   Mrs. Jane A. Smith-Doe
 *   Patient Health Summary, generated on Aug. 07, 2026
 *   Patient Demographics Female; born Mar. 15, 1976
 *   Patient Address … Patient Name … Communication … Language … Race / Ethnicity … Marital Status
 *
 * Delegates to the shared Epic demographics column parser (multi-hit aware).
 */
export function parseEpicMayoCoverDemographics(text: string): Tab14PatientFields {
  const sessions = sliceEpicPatientDemographicsSessions(text);
  if (sessions.length > 0) {
    return pickPrimaryEpicPatientDemographicsFields(sessions);
  }
  return parseEpicPatientDemographicsBody(text);
}

/** Register every recoverable demographics occurrence + sparse PDF-Find-style estimate. */
export function inventoryEpicPatientDemographics(text: string): {
  sessions: ReturnType<typeof sliceEpicPatientDemographicsSessions>;
  occurrenceCount: number;
  fields: Tab14PatientFields;
  occurrences: ReturnType<typeof buildEpicDemographicsOccurrenceList>;
} {
  const sessions = sliceEpicPatientDemographicsSessions(text);
  const fields = recoverSparseEpicDemographicsFields(
    text,
    sessions.length > 0
      ? pickPrimaryEpicPatientDemographicsFields(sessions)
      : parseEpicPatientDemographicsBody(text)
  );
  // Rebuild occurrence rows so inferred reprints carry recovered Address/Name
  const occurrences = buildEpicDemographicsOccurrenceList(text).map((row) => ({
    ...row,
    fields: {
      ...fields,
      ...Object.fromEntries(
        Object.entries(row.fields).filter(([, v]) => String(v ?? '').trim())
      ),
    },
  }));
  const occurrenceCount = Math.max(
    estimateEpicPatientDemographicsOccurrenceCount(text),
    occurrences.length
  );
  return { sessions, occurrenceCount, fields, occurrences };
}

export function parseEpicMayoSexGender(flat: string): Tab14PatientFields {
  const out: Tab14PatientFields = {};
  const sexBirth = flat.match(
    /Sex Assigned at Birth\s+(Female|Male|Other|Unknown|Not on file)/i
  )?.[1];
  if (sexBirth && !/^not on file$/i.test(sexBirth)) out.sexAtBirth = sexBirth;
  const legal = flat.match(/Legal Sex\s+(Female|Male|Other|Unknown|Not on file)/i)?.[1];
  if (legal && !/^not on file$/i.test(legal)) out.legalSex = legal;
  const gi = flat.match(/Gender Identity\s+(Female|Male|Other|Unknown|Non-binary|[A-Za-z /()-]+?)(?=\s+Sexual Orientation|\s+\d{1,2}\/\d{1,2}\/\d{4}|\s+Last Filed|$)/i)?.[1];
  if (gi) out.genderIdentity = collapseWs(gi);
  const so = flat.match(/Sexual Orientation\s+(Straight|Gay|Lesbian|Bisexual|Unknown|[A-Za-z /()-]+?)(?=\s+\d{1,2}\/\d{1,2}\/\d{4}|\s+Last Filed|\s+Social History|$)/i)?.[1];
  if (so) out.sexualOrientation = collapseWs(so);
  return out;
}

export function parseEpicMayoVitals(flat: string): {
  fields: Tab14PatientFields;
  history: Tab14VitalReading[];
} {
  const out: Tab14PatientFields = {};
  const block =
    collectEpicMayoSectionBodies(flat, 'Last Filed Vital Signs').join('\n\n') ||
    (flat.match(/Last Filed Vital Signs[\s\S]{0,2500}/i)?.[0] ?? '');

  const bp = block.match(/Blood Pressure\s+(\d+)\s*\/\s*(\d+)/i);
  if (bp) {
    out.systolicBp = bp[1];
    out.diastolicBp = bp[2];
  }
  const pulse = block.match(/\bPulse\s+(\d+)\b/i);
  if (pulse) out.heartRate = pulse[1];
  const temp = block.match(/Temperature\s+([\d.]+)\s*[°]?C\s*\(([\d.]+)\s*[°]?F\)/i);
  if (temp) {
    out.temperatureC = temp[1];
    out.temperatureF = temp[2];
  }
  const rr = block.match(/Respiratory Rate\s+(\d+)/i);
  if (rr) out.respiratoryRate = rr[1];
  const spo2 = block.match(/Oxygen Saturation\s+(\d+)\s*%/i);
  if (spo2) out.oxygenSaturation = spo2[1];
  const bmi = block.match(/Body Mass Index\s+([\d.]+)/i);
  if (bmi) out.bodyMassIndex = bmi[1];

  // `161 cm (5' 3.39")` or `161 cm (5' 3")`
  const height = block.match(/Height\s+[\d.]+\s*cm\s*\((\d+)'\s*([\d.]+)"\)/i);
  if (height) {
    const inches = Number(height[1]) * 12 + Number(height[2]);
    if (inches > 0) out.heightInches = String(Math.round(inches * 10) / 10);
  }
  // `75.6 kg (166 lb 10.7 oz)` or `75.6 kg (166 lb)`
  const weight = block.match(
    /Weight\s+[\d.]+\s*kg\s*\((\d+(?:\.\d+)?)\s*lb(?:\s+([\d.]+)\s*oz)?\)/i
  );
  if (weight) {
    let lbs = Number(weight[1]);
    if (weight[2]) lbs += Number(weight[2]) / 16;
    out.weightLbs = String(Math.round(lbs * 10) / 10);
  }

  const timeTaken = block.match(
    /Blood Pressure\s+\d+\s*\/\s*\d+\s+(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}:\d{2}\s*[AP]M)/i
  );
  const history: Tab14VitalReading[] = [];
  if (out.systolicBp || out.weightLbs || out.heightInches) {
    history.push({
      recordedDate: timeTaken?.[1] ? tryParseDateToIso(timeTaken[1]) || timeTaken[1] : '',
      recordedTime: timeTaken?.[2] ? collapseWs(timeTaken[2]) : '',
      heightInches: out.heightInches ?? '',
      weightLbs: out.weightLbs ?? '',
      systolicBp: out.systolicBp ?? '',
      diastolicBp: out.diastolicBp ?? '',
      heartRate: out.heartRate ?? '',
      bodyMassIndex: out.bodyMassIndex ?? '',
      temperatureF: out.temperatureF,
      temperatureC: out.temperatureC,
      respiratoryRate: out.respiratoryRate,
      oxygenSaturation: out.oxygenSaturation,
    });
  }
  return { fields: out, history };
}

export function parseEpicMayoAllergies(text: string): Tab14AllergyRow[] {
  const bodies = collectEpicMayoSectionBodies(text, 'Allergies');
  // Prefer section bodies only — a whole-document pass greeds demographics
  // (“Never Married”, “Sex Assigned…”) into false allergen rows.
  const corpus = bodies.length > 0 ? bodies : [text];
  if (
    corpus.every((b) => /No known active allergies/i.test(b) || collapseWs(b).length < 80) &&
    corpus.some((b) => /No known active allergies/i.test(b))
  ) {
    return [];
  }

  const rows: Tab14AllergyRow[] = [];
  const seen = new Set<string>();
  const re =
    /\b([A-Z][A-Za-z0-9()/-]{2,40})\s+(Rash(?:\s*\([^)]*\))?|Hives|Anaphylaxis|Itching|Swelling|Nausea|Unknown|[A-Za-z]{3,24})\s+(Low|Medium|High|Mild|Moderate|Severe)?(?:\s*Criticality)?\s*(\d{1,2}\/\d{1,2}\/\d{4})/g;
  const junkName =
    /^(Active|Allergy|Reactions|Criticality|Noted|Date|Comments|Allergen|Never|Birth|Sex|Identity|Orientation|Married|Female|Male|White|Hispanic|English|Spoken|Written|Patient|Address|Name|Language|Race|Ethnicity|Marital|Communication|Legal|Gender|Sexual)$/i;

  for (const block of corpus) {
    if (/No known active allergies/i.test(block) && collapseWs(block).length < 120) continue;
    const flat = collapseWs(deglueEpicPdfText(block));
    for (const m of flat.matchAll(re)) {
      const name = collapseWs(m[1]);
      if (junkName.test(name)) continue;
      const reaction = collapseWs(m[2]);
      if (/^(Low|Medium|High|Mild|Moderate|Severe|Criticality)$/i.test(reaction)) continue;
      const key = name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        allergyName: name,
        allergyType: 'Drug',
        allergyTypeOther: '',
        severity: m[3] ? collapseWs(m[3]) : '',
        reactionNotes: reaction,
        lastObserved: tryParseDateToIso(m[4]) || m[4],
        criticality: m[3] ? collapseWs(m[3]) : '',
      });
    }
  }
  return rows;
}

export function parseEpicMayoMedications(text: string): Tab14MedicationRow[] {
  const block = collectEpicMayoSectionBodies(text, 'Medications').join('\n\n');
  if (!block) return [];
  const outpatientRaw =
    block.split(/Hospital,\s*Clinic,\s*or Other Facility\s*Administered Medication/i)[0] ?? block;
  let outpatient = collapseWs(deglueEpicPdfText(outpatientRaw))
    .replace(/Medications\s*-\s*as of\s+\d{1,2}\/\d{1,2}\/\d{4}/i, '')
    .replace(
      /Medication\s+Sig\s*Dispense(?:\s*Quantity)?(?:\s*Last Filled)?(?:\s*Start Date)?(?:\s*End Date)?(?:\s*Status)?/i,
      ''
    )
    .trim();

  const rows: Tab14MedicationRow[] = [];
  const seen = new Set<string>();
  const re =
    /\b((?:[A-Za-z][A-Za-z0-9-]{1,30})(?:\s+[A-Za-z0-9-]{1,20}){0,3}(?:\s*\([^)]{1,40}\))?)\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|g|mL|ml|%)(?:\/[^\s]+)?)\s+(tablet|capsule|12\s*hr\s*capsule|injection|cap)?\s*((?:Take|After|Inhale)[\s\S]*?)\s+(Active|Discontinued(?:\([^)]*\))?)/gi;

  for (const m of outpatient.matchAll(re)) {
    let rawName = collapseWs(m[1]);
    rawName = rawName
      .replace(/^(?:Active|Discontinued|Status|Date|Quantity|Last|Filled|Start|End)\s+/i, '')
      .trim();
    if (!rawName || rawName.length < 3) continue;
    if (/^(Take|After|tablet|capsule|injection|Active|Discontinued)$/i.test(rawName)) continue;

    const brand = rawName.match(/^(.+?)\s+\(([^)]+)\)$/);
    const genericName = brand ? collapseWs(brand[1]) : rawName;
    const brandName = brand ? collapseWs(brand[2]) : '';
    if (/^(once|daily|week|mouth|needed|status|date)$/i.test(genericName)) continue;

    const status = /Discontinued/i.test(m[5]) ? 'Discontinued' : 'Active';
    const sig = collapseWs(m[4]).slice(0, 240);
    const key = `${genericName}|${m[2]}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    rows.push({
      genericName,
      brandName,
      dosage: collapseWs(m[2]),
      route: /by mouth|oral/i.test(sig) ? 'Oral' : /IV|injection/i.test(sig) ? 'IV' : '',
      frequency: /once a week|weekly/i.test(sig)
        ? 'Weekly'
        : /twice daily|2 cap twice/i.test(sig)
          ? 'BID'
          : /daily|once a day/i.test(sig)
            ? 'Daily'
            : /as needed|PRN/i.test(sig)
              ? 'PRN'
              : /bedtime/i.test(sig)
                ? 'HS'
                : '',
      startDate: '',
      endDate: '',
      purpose: '',
      prescribingPhysician: '',
      notesMedication: `${status}${sig ? ` — ${sig}` : ''}`.slice(0, 280),
    });
  }

  for (const m of outpatient.matchAll(
    /\b(MULTIVITAMIN(?:\s+ORAL)?)\s+(Take\s+[\s\S]*?)\s+(Active|Discontinued)/gi
  )) {
    const genericName = collapseWs(m[1]);
    const key = genericName.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      genericName,
      brandName: '',
      dosage: '',
      route: 'Oral',
      frequency: /daily/i.test(m[2]) ? 'Daily' : '',
      startDate: '',
      endDate: '',
      purpose: '',
      prescribingPhysician: '',
      notesMedication: `${collapseWs(m[3])} — ${collapseWs(m[2])}`.slice(0, 280),
    });
  }

  const adminBlock =
    block.match(
      /Administered Medication Ordered Dose Route Frequency Start Date End Date Status([\s\S]*?)(?=Active Problems\s*-\s*as of|$)/i
    )?.[1] ?? '';
  const adminFlat = collapseWs(adminBlock);
  for (const m of adminFlat.matchAll(
    /\b(fluorescein|indocyanine green|sodium chloride|iohexol)(?:[^\d]{0,60}?)(\d+(?:\.\d+)?\s*(?:mg|mL))\b[^\d]{0,80}?(IV|oral)?[^\d]{0,40}?(Once(?:\s+in\s+imaging)?|As needed)?[^\d]{0,20}(\d{1,2}\/\d{1,2}\/\d{4})?/gi
  )) {
    const genericName = collapseWs(m[1]);
    const key = `admin|${genericName}|${m[2]}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      genericName,
      brandName: '',
      dosage: collapseWs(m[2]),
      route: /IV/i.test(m[3] ?? 'IV') ? 'IV' : collapseWs(m[3] ?? '') || 'IV',
      frequency: /Once/i.test(m[4] ?? '') ? 'Once' : /needed/i.test(m[4] ?? '') ? 'PRN' : '',
      startDate: m[5] ? tryParseDateToIso(m[5]) || m[5] : '',
      endDate: '',
      purpose: 'Facility administered',
      prescribingPhysician: '',
      notesMedication: collapseWs(m[0]).slice(0, 220),
    });
  }

  return rows;
}

export function parseEpicMayoActiveProblems(text: string): Tab14ChronicRow[] {
  const block = collectEpicMayoSectionBodies(text, 'Active Problems').join('\n\n');
  if (!block) return [];
  const flat = collapseWs(block)
    .replace(/Active Problems\s*-\s*as of\s+\d{1,2}\/\d{1,2}\/\d{4}/i, '')
    .replace(/Problem\s+Noted Date\s+Diagnosed Date/i, '');

  const rows: Tab14ChronicRow[] = [];
  const seen = new Set<string>();
  const re =
    /\b([A-Z][A-Za-z0-9 ,/+'-]{2,80}?)\s+(\d{1,2}\/\d{1,2}\/\d{4})(?=\s+[A-Z]|\s*$)/g;
  for (const m of flat.matchAll(re)) {
    const name = collapseWs(m[1])
      .replace(/^(Problem|Noted|Diagnosed|Date)\s+/i, '')
      .trim();
    if (!name || name.length < 3) continue;
    if (/^(Immunizations|Social History|Medications)$/i.test(name)) break;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push({
      conditionName: name,
      icdCode: '',
      diagnosisDate: tryParseDateToIso(m[2]) || m[2],
      severity: '',
      prexisting: '',
      notesChronicConditions: '',
    });
  }
  return rows;
}

export function parseEpicMayoImmunizations(text: string): Tab14ClinicalEntry[] {
  const block =
    collectEpicMayoSectionBodies(text, 'Immunizations').join('\n\n') ||
    (text.match(/Immunizations\b[\s\S]{0,2500}?(?=Social History\b|Procedures\b|Results\b|$)/i)?.[0] ??
      '');
  if (!block) return [];
  const flat = collapseWs(block);
  const rows: Tab14ClinicalEntry[] = [];
  const seen = new Set<string>();

  for (const m of flat.matchAll(
    /\b([A-Z][A-Za-z0-9 ,()/-]{1,80}?)\s+(?:\(Given\s+)?(\d{1,2}\/\d{1,2}\/\d{2,4})(?:\s*,\s*(\d{1,2}\/\d{1,2}\/\d{2,4}))?/gi
  )) {
    const title = collapseWs(m[1])
      .replace(/\(\s*$/, '')
      .replace(/^(Immunization|Administration|Dates|Next Due)\s+/i, '')
      .trim();
    if (!title || title.length < 2) continue;
    if (/^(Given|Social|Tobacco|Alcohol)$/i.test(title)) continue;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const d1 = tryParseDateToIso(m[2]) || m[2];
    const d2 = m[3] ? tryParseDateToIso(m[3]) || m[3] : '';
    rows.push(
      entry({
        title,
        detail: d2 ? `Also given ${d2}` : '',
        date: d1,
        status: 'Completed',
      })
    );
  }
  return rows;
}

export function parseEpicMayoSocialHistory(text: string): Tab14ClinicalEntry[] {
  const block =
    collectEpicMayoSectionBodies(text, 'Social History').join('\n\n') ||
    (text.match(/Social History\b[\s\S]{0,4000}?(?=Sex and Gender|Last Filed|Plan of Treatment|Procedures|$)/i)?.[0] ??
      '');
  if (!block) return [];
  const rows: Tab14ClinicalEntry[] = [];
  const smoking = block.match(/Smoking Tobacco:\s*(Never|Former|Current|[A-Za-z ]+)/i)?.[1];
  if (smoking) {
    rows.push(entry({ title: 'Smoking Tobacco', detail: collapseWs(smoking) }));
  }
  const alcohol = block.match(
    /Alcohol Use[\s\S]{0,80}?Yes\s+(\d+(?:\.\d+)?)\s*\([^)]*standard drink/i
  );
  if (alcohol) {
    rows.push(
      entry({
        title: 'Alcohol Use',
        detail: `${alcohol[1]} standard drink(s)/week`,
        date: tryParseDateToIso(block.match(/Alcohol Use[\s\S]{0,120}?(\d{1,2}\/\d{1,2}\/\d{4})/i)?.[1] ?? '') || '',
      })
    );
  } else if (/Alcohol Use[\s\S]{0,40}\bNo\b/i.test(block)) {
    rows.push(entry({ title: 'Alcohol Use', detail: 'No' }));
  }
  const housing = block.match(/living situation today\?\s*([^\n\d]{5,80}?)\s+(\d{1,2}\/\d{1,2}\/\d{4})/i);
  if (housing) {
    rows.push(
      entry({
        title: 'Housing Stability',
        detail: collapseWs(housing[1]),
        date: tryParseDateToIso(housing[2]) || housing[2],
      })
    );
  }
  const pregnant = block.match(/Pregnant Comments\s+(Yes|No)/i)?.[1];
  if (pregnant) {
    rows.push(entry({ title: 'Pregnant', detail: pregnant }));
  }
  return rows;
}

export function parseEpicMayoPlanOfTreatment(text: string): Tab14ClinicalEntry[] {
  const block = collectEpicMayoSectionBodies(text, 'Plan of Treatment').join('\n\n');
  if (!block) return [];
  if (/Not on file/i.test(block)) {
    return [noneRecorded('Not on file')];
  }
  const flat = collapseWs(block)
    .replace(/Plan of Treatment\s*-\s*as of\s+\d{1,2}\/\d{1,2}\/\d{4}/i, '')
    .trim();
  if (!flat || flat.length < 8) return [noneRecorded('Not on file')];
  return [entry({ title: 'Plan of Treatment', detail: flat.slice(0, 600) })];
}

export function parseEpicMayoProcedures(text: string): Tab14ClinicalEntry[] {
  const block = collectEpicMayoSectionBodies(text, 'Procedures').join('\n\n');
  if (!block) {
    // Early summary style: `PROCEDURE (Performed 8/3/2026)`
    const early =
      text.match(/Procedures\b([\s\S]*?)(?=\bResults\b|\bNotes\b|\bEncounters\b|$)/i)?.[1] ?? '';
    const rows: Tab14ClinicalEntry[] = [];
    for (const m of early.matchAll(
      /([A-Z][A-Z0-9 ,()/-]{5,120}?)\s*\(Performed\s+(\d{1,2}\/\d{1,2}\/\d{4})\)/g
    )) {
      rows.push(
        entry({
          title: collapseWs(m[1]),
          date: tryParseDateToIso(m[2]) || m[2],
          status: 'Performed',
        })
      );
    }
    return rows;
  }

  const flat = collapseWs(block)
    .replace(/Procedures\s*-\s*as of\s+\d{1,2}\/\d{1,2}\/\d{4}/i, '')
    .replace(/Procedure Name\s+Priority\s+Date\/Time\s+Associated Diagnosis\s+Comments/i, '');

  const rows: Tab14ClinicalEntry[] = [];
  const seen = new Set<string>();
  const re =
    /([A-Z][A-Z0-9 ,()/-]{5,120}?)\s+(Routine|STAT|Urgent)?\s*(\d{1,2}\/\d{1,2}\/\d{4})(?:\s+\d{1,2}:\d{2}\s*[AP]M(?:\s*CDT)?)?/g;
  for (const m of flat.matchAll(re)) {
    const title = collapseWs(m[1]);
    if (/^(Procedure|Name|Priority|Associated|Diagnosis|Comments)$/i.test(title)) continue;
    const key = `${title}|${m[3]}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    rows.push(
      entry({
        title,
        date: tryParseDateToIso(m[3]) || m[3],
        category: m[2] ? collapseWs(m[2]) : 'Routine',
        status: 'Performed',
      })
    );
  }
  return rows;
}

export function parseEpicMayoEncounters(text: string): {
  visits: Tab14HospitalFields[];
  careTeam: Tab14ClinicalEntry[];
} {
  /**
   * Important: PDF Find can show ~30 “Encounter Details” hits while the text layer
   * often has only 1–2 (yellow titles are frequently image/vector, not extractable).
   * Never early-return on sparse Encounter Details — always merge the
   * `Encounters - as of` inventory table (the reliable full visit list).
   */
  const detailSessions = sliceEpicEncounterDetailSessions(text);
  const fromDetails = visitsFromEncounterDetailSessions(detailSessions);
  const fromTable = parseEpicEncountersAsOfTable(text);
  const visits = mergeHospitalVisitsByKey(
    fromTable.visits.length >= fromDetails.visits.length ? fromTable.visits : fromDetails.visits,
    fromTable.visits.length >= fromDetails.visits.length ? fromDetails.visits : fromTable.visits
  );
  const careTeam = mergeCareTeamByTitle(fromDetails.careTeam, fromTable.careTeam);
  return { visits, careTeam };
}

const EPIC_ENCOUNTER_VISIT_TYPE_RE =
  /Hospital\s+Encounter|Office\s+Visit|Comprehensive\s+Visit|Telemedicine|Infusion|Documentation|Clinical\s+Communication|Appointment|Procedure\s+Visit|Nursing\s+Visit/gi;

function visitsFromEncounterDetailSessions(
  detailSessions: ReturnType<typeof sliceEpicEncounterDetailSessions>
): { visits: Tab14HospitalFields[]; careTeam: Tab14ClinicalEntry[] } {
  const visits: Tab14HospitalFields[] = [];
  const careSeen = new Set<string>();
  const careTeam: Tab14ClinicalEntry[] = [];
  const visitSeen = new Set<string>();

  for (const session of detailSessions) {
    const dateIso = session.dateRaw
      ? tryParseDateToIso(session.dateRaw.split(',')[0]?.trim() ?? session.dateRaw) ||
        session.dateRaw
      : '';
    const visitType = session.visitType || 'Encounter';
    const facility = session.department || '';
    const attending = session.careTeamRaw || '';
    const key = `${dateIso}|${visitType}|${facility.slice(0, 40)}`.toLowerCase();
    if (!visitSeen.has(key)) {
      visitSeen.add(key);
      visits.push({
        visitDate: dateIso,
        visitType,
        facilityName: facility.slice(0, 160),
        attendingPhysician: attending.slice(0, 120),
        reason: '',
        reportId: `Encounter Details #${session.index + 1}`,
      });
    }

    if (attending) {
      const nameGuess =
        attending.match(
          /^([A-Z][a-z]+(?:\s+[A-Z][a-z'.-]+)+(?:,\s*(?:M\.D\.|M\.B\.B\.S\.|Ph\.D\.|APRN|C\.N\.P\.|D\.N\.P\.))?)/
        )?.[1] ?? attending.split(/\d{3}/)[0]?.trim();
      if (nameGuess && nameGuess.length >= 4) {
        const ck = nameGuess.toLowerCase();
        if (!careSeen.has(ck)) {
          careSeen.add(ck);
          careTeam.push(
            entry({
              title: collapseWs(nameGuess).slice(0, 120),
              role: /M\.D\.|APRN|C\.N\.P\.|Ph\.D\./i.test(attending) ? 'Clinician' : 'Care Team',
              detail: `From Encounter Details (${dateIso || 'undated'})`,
              place: /Rochester|Mayo|Albert Lea/i.test(facility + attending)
                ? 'Mayo Clinic'
                : facility.slice(0, 80),
            })
          );
        }
      }
    }
    if (visits.length >= 80) break;
  }

  return { visits, careTeam };
}

/**
 * Parse the global `Encounters - as of DATE` inventory (pages of Date/Type/Department rows).
 * This is the text-layer source of truth when “Encounter Details” titles are image-only.
 */
export function parseEpicEncountersAsOfTable(text: string): {
  visits: Tab14HospitalFields[];
  careTeam: Tab14ClinicalEntry[];
} {
  const block = sliceEpicMayoAsOfSection(text, 'Encounters');
  if (!block) return { visits: [], careTeam: [] };

  const careSeen = new Set<string>();
  const careTeam: Tab14ClinicalEntry[] = [];
  const providerRe =
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z'.-]+)+),\s*((?:M\.D\.|M\.B\.B\.S\.|Ph\.D\.|APRN|C\.N\.P\.|D\.N\.P\.|Pharm\.D\.|R\.Ph\.)(?:,?\s*(?:M\.D\.|M\.B\.B\.S\.|Ph\.D\.|APRN|C\.N\.P\.|D\.N\.P\.|Pharm\.D\.|R\.Ph\.))*)/g;

  for (const m of block.matchAll(providerRe)) {
    const name = collapseWs(m[1]);
    const creds = collapseWs(m[2]);
    const key = name.toLowerCase();
    if (careSeen.has(key)) continue;
    if (/^(Date|Type|Department|Care|Team|Description|Nurse Brook)$/i.test(name)) continue;
    careSeen.add(key);
    careTeam.push(
      entry({
        title: name,
        role: creds,
        detail: '',
        place: /Rochester|Mayo|Albert Lea/i.test(block) ? 'Mayo Clinic' : '',
      })
    );
  }

  const visits: Tab14HospitalFields[] = [];
  const visitSeen = new Set<string>();
  const typeRe = new RegExp(EPIC_ENCOUNTER_VISIT_TYPE_RE.source, 'gi');
  let m: RegExpExecArray | null;
  while ((m = typeRe.exec(block)) !== null) {
    const visitType = collapseWs(m[0]);
    const before = block.slice(Math.max(0, m.index - 320), m.index);
    const dateMatch = [...before.matchAll(/(\d{1,2}\/\d{1,2}\/\d{4})/g)].pop();
    if (!dateMatch) continue;
    const date = tryParseDateToIso(dateMatch[1]!) || dateMatch[1]!;
    const after = block.slice(m.index, m.index + 280);
    const facilityRaw =
      after.match(
        /((?:Department|Division|Mayo Clinic)[\s\S]{5,140}?)(?=\d{2,5}\s+[A-Z0-9]|\d{1,2}\/\d{1,2}\/\d{4}|Discharge Disposition|Hospital\s+Encounter|Office\s+Visit|Comprehensive\s+Visit|$)/i
      )?.[1] ?? '';
    const facility = collapseWs(facilityRaw)
      .replace(/\s+/g, ' ')
      .replace(/,\s*$/, '')
      .slice(0, 160);
    const attending = after.match(providerRe)?.[0];
    const key = `${date}|${visitType}|${facility.slice(0, 40)}`.toLowerCase();
    if (visitSeen.has(key)) continue;
    visitSeen.add(key);
    visits.push({
      visitDate: date,
      visitType,
      facilityName: facility,
      attendingPhysician: attending ? collapseWs(attending).slice(0, 120) : '',
      reason: '',
      reportId: /Discharge Disposition:\s*([A-Za-z /]+)/i.test(after)
        ? `Discharge: ${collapseWs(after.match(/Discharge Disposition:\s*([A-Za-z /]+)/i)?.[1] ?? '')}`
        : 'Encounters - as of',
    });
    if (visits.length >= 80) break;
  }

  return { visits, careTeam };
}

function mergeHospitalVisitsByKey(
  primary: Tab14HospitalFields[],
  secondary: Tab14HospitalFields[]
): Tab14HospitalFields[] {
  const out: Tab14HospitalFields[] = [];
  const seen = new Set<string>();
  for (const row of [...primary, ...secondary]) {
    const key = `${row.visitDate ?? ''}|${row.visitType ?? ''}|${(row.facilityName ?? '').slice(0, 40)}`.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
    if (out.length >= 80) break;
  }
  return out;
}

function mergeCareTeamByTitle(
  a: Tab14ClinicalEntry[],
  b: Tab14ClinicalEntry[]
): Tab14ClinicalEntry[] {
  const out: Tab14ClinicalEntry[] = [];
  const seen = new Set<string>();
  for (const row of [...a, ...b]) {
    const key = (row.title || '').toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out;
}



function cleanEpicMayoLabTitle(raw: string): string {
  let s = collapseWs(raw);
  s = s.replace(/^Results\s*-\s*as of\s+\d{1,2}\/\d{1,2}\/\d{4}\s*/i, '');
  s = s.replace(/^[\s\S]*?\b\d{5}(?:,\s*USA)?\s+/i, '');
  s = s.replace(/^(?:NW|SW|NE|SE)\s+Rochester,\s*MN\s+\d{5}\s+/i, '');
  s = s.replace(/^Street\s+SW\s+Rochester,\s*MN\s+\d{5}/i, '');
  const withCode = s.match(/^(.+?)\s+\(([A-Z0-9][A-Z0-9 ,()/%-]{2,80})\)\s*$/);
  if (withCode && withCode[1]!.length >= 3 && !/Rochester|Mayo Clinic|Superior/i.test(withCode[1]!)) {
    return collapseWs(withCode[1]!).slice(0, 120);
  }
  return s.slice(0, 120);
}

function parseMayoLabComponentChunk(chunk: string): Tab14LabComponent[] {
  const comps: Tab14LabComponent[] = [];
  const flat = collapseWs(chunk);
  const re =
    /\b([A-Za-z][A-Za-z0-9 ,()/%-]{1,50}?)\s+(<|>)?\s*([\d.]+|\d+\/\d+)\s*(?:\(H\)|\(L\)|\(A\))?\s+([\d.<>\s-]+)?\s*([A-Za-zμ%µ\/()0-9.-]{0,20})?/g;
  for (const m of flat.matchAll(re)) {
    const name = collapseWs(m[1]!);
    if (
      /^(Component|Value|Ref|Range|Test|Method|Analysis|Time|Performed|At|Pathologist|Signature|Specimen|Narrative|Authorizing|Provider|Result|Type|Status|Comment|Interpretation)$/i.test(
        name
      )
    ) {
      continue;
    }
    if (name.length < 2 || name.length > 48) continue;
    const flag = /\(H\)/i.test(m[0]) ? 'H' : /\(L\)/i.test(m[0]) ? 'L' : '';
    const rawVal = `${m[2] ?? ''}${m[3]}`.trim();
    const num = Number(rawVal);
    comps.push({
      name,
      value: Number.isFinite(num) ? num : undefined,
      textValue: Number.isFinite(num) ? undefined : rawVal,
      unit: m[5] ? collapseWs(m[5]) : '',
      range: m[4] ? collapseWs(m[4]) : '',
      critical: flag === 'H' || flag === 'L',
      interpretation: flag,
    });
    if (comps.length >= 30) break;
  }
  return comps;
}

function parseEpicMayoResultsBlock(
  block: string,
  labs: Tab14LabPanel[],
  imaging: Tab14ClinicalEntry[],
  maxPanels: number
): void {
  const panelRe =
    /(?:\((?:ABNORMAL)\)\s*)?([A-Z][A-Za-z0-9 ,()/%-]{3,100}?)\s*-\s*(?:Edited Result\s*-\s*)?Final result\s*\((\d{1,2}\/\d{1,2}\/\d{4})[^)]*\)/gi;

  const matches = [...block.matchAll(panelRe)];
  for (let i = 0; i < matches.length && labs.length + imaging.length < maxPanels; i++) {
    const m = matches[i]!;
    const title = cleanEpicMayoLabTitle(m[1]!);
    if (!title || title.length < 3) continue;
    if (/Rochester|Superior Dr|Mayo Clinic Laboratories|^NW\b|^Street\b|Phone Number|ZIP Code|City\/State|ty\/State/i.test(title)) {
      continue;
    }
    if (/OPHTHALMOLOGY IMAGING|AUTOMATED VF|OPTICAL COHERENCE/i.test(title)) {
      imaging.push(
        entry({
          title: title.replace(/^[\s\S]*?(AUTOMATED VF|OPTICAL COHERENCE)/i, '$1').slice(0, 120),
          date: tryParseDateToIso(m[2]!) || m[2]!,
          status: 'Final',
          place: 'Mayo Clinic',
        })
      );
      continue;
    }

    const date = tryParseDateToIso(m[2]!) || m[2]!;
    const start = (m.index ?? 0) + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1]!.index ?? start + 2000 : start + 2000;
    const chunk = block.slice(start, Math.min(end, start + 2500));

    if (/MR\b|MRI|CT\b|X-?Ray|Ultrasound|OCT|Angiograph|IMG\b|Radiolog/i.test(title)) {
      const impression =
        chunk.match(/Impressions?\s+([\s\S]{20,400}?)(?=Authorizing Provider|Performing Organization|Specimen|$)/i)?.[1] ??
        '';
      imaging.push(
        entry({
          title,
          detail: collapseWs(impression).slice(0, 500),
          date,
          status: 'Final',
          place: /Mayo Clinic/i.test(chunk) ? 'Mayo Clinic' : '',
        })
      );
      continue;
    }

    const components = parseMayoLabComponentChunk(chunk);
    if (components.length === 0) {
      labs.push({
        testName: title,
        date,
        status: 'Final',
        isNew: true,
        category: 'lab',
        components: [
          {
            name: title,
            textValue: collapseWs(chunk.match(/Interpretation:\s*([^\n.]{3,80})/i)?.[1] ?? '').slice(0, 120),
            unit: '',
            range: '',
            critical: /\(ABNORMAL\)/i.test(m[0]),
            interpretation: '',
          },
        ],
      });
      continue;
    }

    labs.push({
      testName: title,
      date,
      status: 'Final',
      isNew: true,
      category: 'lab',
      components,
    });
  }
}

export function parseEpicMayoResults(text: string): {
  labs: Tab14LabPanel[];
  imaging: Tab14ClinicalEntry[];
} {
  const labs: Tab14LabPanel[] = [];
  const imaging: Tab14ClinicalEntry[] = [];
  const maxPanels = 80;

  const sessions = sliceAllEpicResultsSessions(text);
  if (sessions.length > 0) {
    for (const session of sessions) {
      if (labs.length + imaging.length >= maxPanels) break;
      parseEpicMayoResultsBlock(session.body, labs, imaging, maxPanels);
    }
    return { labs, imaging };
  }

  const block =
    collectEpicMayoSectionBodies(text, 'Results').join('\n\n') ||
    (text.match(/Results\b([\s\S]{0,80000})/i)?.[1] ?? '');
  if (block) parseEpicMayoResultsBlock(block, labs, imaging, maxPanels);
  return { labs, imaging };
}

export function buildEpicMayoExtendedOverlays(text: string): Tab14ExtendedSections {
  const out = emptyExtendedSections();
  const pot = parseEpicMayoPlanOfTreatment(text);
  if (pot.length) out.planOfTreatment = pot;

  const procedures = parseEpicMayoProcedures(text);
  if (procedures.length) out.procedures = procedures;

  const shots = parseEpicMayoImmunizations(text);
  if (shots.length) out.immunizations = shots;

  const social = parseEpicMayoSocialHistory(text);
  if (social.length) out.socialHistory = social;

  const { careTeam } = parseEpicMayoEncounters(text);
  if (careTeam.length) {
    out.careTeam = careTeam;
    out.careTeamMembers = careTeam.map((c) =>
      entry({
        title: c.title,
        role: c.role,
        place: c.place,
        detail: '',
      })
    );
  }

  const { imaging } = parseEpicMayoResults(text);
  if (imaging.length) out.imagingResults = imaging;

  // Explicit empties / not-on-file so completeness can count none_recorded
  out.reasonForReferral = [noneRecorded('Not present in Epic My Health Summary snapshot.')];
  out.medicalEquipment = [noneRecorded('Not present in Epic My Health Summary snapshot.')];
  out.goals = [noneRecorded('Not present in global snapshot (may appear in encounter notes).')];
  out.healthConcerns = [noneRecorded('Not present in global snapshot (may appear in encounter notes).')];
  out.advanceDirectives = [noneRecorded('Not present in global snapshot (may appear in encounter notes).')];
  const noteInventory = inventoryEpicNoteFromClinic(text);
  out.patientInstructions = noteInventory.entries;
  out.assessment = [noneRecorded('Not present in global snapshot (may appear in encounter notes).')];
  out.familyHistory = [noneRecorded('Not present in global snapshot (may appear in encounter notes).')];
  out.surgicalHistory = [noneRecorded('Not present in global snapshot (may appear in encounter notes).')];
  out.procedureNotes = [noneRecorded('Not present in global snapshot (may appear in encounter notes).')];
  out.functionalStatus = [noneRecorded('Not present in global snapshot (may appear in encounter notes).')];
  out.mentalStatus = [noneRecorded('Not present in global snapshot (may appear in encounter notes).')];
  out.medicalHistory = [noneRecorded('Not present in global snapshot — see Active Problems.')];
  out.relatedPerson = [noneRecorded('Not present in text layer (cover/demographics may be image-only).')];
  out.notes = [noneRecorded('Encounter clinical notes omitted from snapshot parse (full PDF is 500+ pages).')];

  const pregnant = social.find((s) => /^Pregnant$/i.test(s.title));
  if (pregnant?.detail && /^No$/i.test(pregnant.detail)) {
    out.obstetricsHistory = [noneRecorded('Pregnant: No')];
  } else {
    out.obstetricsHistory = [noneRecorded('Not present in global snapshot.')];
  }

  return out;
}

/** Age mention from narrative when demographics page has no DOB. */
export function parseEpicMayoAgeHint(flat: string): Tab14PatientFields {
  const out: Tab14PatientFields = {};
  const age = flat.match(/\b(\d{1,3})[-\s]?year[-\s]?old\s+(female|male)\b/i);
  if (age) {
    out.otherNotes = `Age mentioned in notes: ${age[1]}-year-old ${age[2].toLowerCase()}`;
  }
  return out;
}

export function parseEpicMayoPatientIdentityGuard(): Tab14PatientFields {
  // Do not invent names — cover page is often image-only for this dialect.
  return {};
}

/** Strip general-extractor junk that looks like table headers, not people. */
export function isImplausibleEpicPersonName(value: string | undefined): boolean {
  if (!value) return true;
  const t = collapseWs(value);
  if (t.length < 2) return true;
  return /priority|procedure|associated|date\/time|diagnosis|comments|component|value|ref range|sig|dispense|quantity|mayo clinic|department|division|encounter|hospital|office visit|comprehensive|telemedicine|infusion/i.test(
    t
  );
}

export function scrubImplausibleEpicPatientNames(fields: Tab14PatientFields): Tab14PatientFields {
  const out = { ...fields };
  if (isImplausibleEpicPersonName(out.givenName)) delete out.givenName;
  if (isImplausibleEpicPersonName(out.familyName)) delete out.familyName;
  if (isImplausibleEpicPersonName(out.patientFullName)) delete out.patientFullName;
  // Reject Language values that swallowed the rest of the demographics grid (OCR greed).
  if (
    out.preferredLanguage &&
    (/Race\s*\/\s*Ethnicity|Marital Status|Patient Name|Aliases|Communication/i.test(
      out.preferredLanguage
    ) ||
      out.preferredLanguage.length > 120)
  ) {
    delete out.preferredLanguage;
  }
  // Department phones must not become patient phone
  if (out.phoneNumber && /507-284|507-255|507-538|507-373/.test(out.phoneNumber)) {
    delete out.phoneNumber;
  }
  return out;
}
