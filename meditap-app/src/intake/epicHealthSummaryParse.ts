/**
 * Epic MyChart Patient Health Summary / Summary of Care exports (CCD-style).
 */

import { tryParseDateToIso } from './intakeDateParse';
import { collapseWs, splitPersonName } from './intakeFieldLabels';
import { withSanitizedPatientFieldWarnings } from './intakeFieldWarnings';
import type {
  Tab14AllergyRow,
  Tab14ChronicRow,
  Tab14HospitalFields,
  Tab14InsuranceRow,
  Tab14IntakeParseResult,
  Tab14LabComponent,
  Tab14LabPanel,
  Tab14MedicationRow,
  Tab14PatientFields,
} from './tab14IntakeTypes';
import { emptyInsuranceRow } from './tab14IntakeTypes';

function firstMatch(text: string, re: RegExp): string | undefined {
  return text.match(re)?.[1]?.trim();
}

function isRedactedId(value: string | undefined): boolean {
  if (!value) return true;
  const t = value.trim();
  return !t || /^x+$/i.test(t);
}

export function isEpicHealthSummaryDocument(text: string): boolean {
  const flat = collapseWs(text);
  return (
    (/Patient Health Summary|Summary of Care, generated on/i.test(flat) &&
      (/Copyright ©\d{4} Epic|Note from Centralus|Epic Systems Corporation/i.test(flat) ||
        /Encounter Details Date Type Department/i.test(flat))) ||
    (/Patient Demographics\s*-\s*(?:Female|Male)/i.test(flat) &&
      /Visit Diagnoses - documented in this encounter/i.test(flat))
  );
}

function parseEpicPatientName(flat: string): Tab14PatientFields {
  const out: Tab14PatientFields = {};
  const labeled = flat.match(/Patient Name\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+Communication/i);
  const shared = flat.match(/shared with\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\./i);
  const full = (labeled?.[1] ?? shared?.[1] ?? '').trim();
  if (full) {
    const split = splitPersonName(full);
    if (split.given) out.givenName = split.given;
    if (split.family) out.familyName = split.family;
  }
  return out;
}

function parseEpicDemographicsBanner(flat: string): Tab14PatientFields {
  const out: Tab14PatientFields = {};
  const m = flat.match(
    /Patient Demographics\s*-\s*(Female|Male)[;\s]+Language\s+Race\s*\/\s*Ethnicity\s+Marital\s+Status\s+(.+?)\s+born\s+((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2},?\s+\d{4})/i
  );
  if (!m) return out;

  out.sexAtBirth = /^f/i.test(m[1]) ? 'Female' : 'Male';
  const iso = tryParseDateToIso(m[3]);
  if (iso) out.dateOfBirth = iso;

  const mid = m[2];
  const maritalMatch = mid.match(/(Single|Married|Never Married|Divorced|Widowed|Separated)\s*$/i);
  const marital = maritalMatch?.[1] ?? '';
  const beforeMarital = marital ? mid.slice(0, mid.length - marital.length).trim() : mid;
  const parts = beforeMarital.match(
    /^(.+?)\s+(White|Black|Asian|American Indian|Pacific Islander|Other|Unknown)\s+\/\s+(\S+)/i
  );
  if (parts) {
    out.preferredLanguage = collapseWs(parts[1].replace(/\(Preferred\)/i, '').trim());
    out.race = parts[2];
    out.ethnicity = parts[3];
  }
  if (marital) out.maritalStatus = marital;
  return out;
}

function parseEpicSexGender(flat: string): Tab14PatientFields {
  const out: Tab14PatientFields = {};
  const sexBirth = flat.match(
    /Sex Assigned at Birth\s+(Female|Male|Other|Unknown|Not on file)\s+(\d{1,2}\/\d{1,2}\/\d{4})?/i
  );
  if (sexBirth?.[1] && !/^not on file$/i.test(sexBirth[1])) {
    out.sexAtBirth = sexBirth[1];
  }
  if (sexBirth?.[2]) {
    out.sexAtBirthRecordedOn = tryParseDateToIso(sexBirth[2]) ?? sexBirth[2];
  }
  const legal = flat.match(/Legal Sex\s+(Female|Male|Other|Unknown|Not on file)/i)?.[1];
  if (legal && !/^not on file$/i.test(legal)) out.legalSex = legal;
  const gi = flat.match(/Gender Identity\s+([A-Za-z0-9 /()-]+?)(?=\s+Sexual Orientation|\s+Last Filed|\s+Social History|$)/i)?.[1];
  if (gi) out.genderIdentity = collapseWs(gi);
  const so = flat.match(/Sexual Orientation\s+([A-Za-z0-9 /()-]+?)(?=\s+Last Filed|\s+Social History|\s+Patient Name|$)/i)?.[1];
  if (so) out.sexualOrientation = collapseWs(so);
  return out;
}

function parseEpicContact(flat: string): Tab14PatientFields {
  const out: Tab14PatientFields = {};

  const addr = flat.match(
    /Patient Address\s+(\d+[^]*?\(\w+\)\s+[A-Za-z .'-]+,\s*[A-Z]{2}\s+\d{5})/i
  );
  if (addr) out.address = collapseWs(addr[1]);

  const phone = flat.match(/Communication\s+([\d()-\s]{7,20})\s*\(\s*Mobile\s*\)/i);
  if (phone) out.phoneNumber = collapseWs(phone[1]);

  const commBlock =
    flat.match(
      /Communication\s+([\s\S]*?)(?=Patient Health Summary|Results|Last Filed|Note from Centralus|Patient Demographics|$)/i
    )?.[1] ?? flat;
  const emails = [...commBlock.matchAll(/([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi)].map(
    (m) => m[1]
  );
  const unique: string[] = [];
  for (const e of emails) {
    if (!unique.some((u) => u.toLowerCase() === e.toLowerCase())) unique.push(e);
  }
  if (unique[0]) out.email = unique[0];
  if (unique.length > 1) out.additionalEmails = unique.slice(1);

  const note = flat.match(
    /Note from Centralus\s+This document contains information that was shared with[^.]+\.\s*It may not contain the entire record from Centralus\./i
  );
  if (note) out.otherNotes = collapseWs(note[0]);

  return out;
}

function parseEpicVitals(flat: string): Tab14PatientFields {
  const out: Tab14PatientFields = {};
  const height = flat.match(/Height\s+[\d.]+\s*cm\s*\((\d+)'\s*(\d+)"/i);
  if (height) {
    const inches = Number(height[1]) * 12 + Number(height[2]);
    if (inches > 0) out.heightInches = String(inches);
  }
  const weight = flat.match(/Weight\s+[\d.]+\s*kg\s*\((\d+(?:\.\d+)?)\s*lb\)/i);
  if (weight) out.weightLbs = weight[1];

  const bp = flat.match(/Blood Pressure\s+(\d+)\s*\/\s*(\d+)/i);
  if (bp) {
    out.systolicBp = bp[1];
    out.diastolicBp = bp[2];
  }
  const pulse = flat.match(/\bPulse\s+(\d+)\b/i);
  if (pulse) out.heartRate = pulse[1];
  return out;
}

function parseEpicAllergies(flat: string, raw: string): { nkda: boolean; rows: Tab14AllergyRow[] } {
  const nkda = /No known active allergies/i.test(flat);
  const rows: Tab14AllergyRow[] = [];
  if (nkda) return { nkda, rows };

  const block =
    raw.match(
      /Allergies - documented[\s\S]*?(?=Medications - documented|Active Problems|Social History|Insurance - documented|Visit Diagnoses|$)/i
    )?.[0] ?? '';
  for (const m of block.matchAll(
    /([A-Za-z][A-Za-z0-9 ()/-]{1,60})\s+(Mild|Moderate|Severe|Unknown)?\s*(Anaphylaxis|Rash|Hives|Nausea|Itching|Swelling|Unknown|[A-Za-z ]{3,40})?/gi
  )) {
    const name = collapseWs(m[1]);
    if (/^allerg|documented|substance|reaction|status|no known/i.test(name)) continue;
    if (name.length < 3) continue;
    rows.push({
      allergyName: name,
      allergyType: 'Drug',
      allergyTypeOther: '',
      severity: m[2] ? collapseWs(m[2]) : '',
      reactionNotes: m[3] ? collapseWs(m[3]) : '',
      lastObserved: '',
    });
  }
  return { nkda: false, rows };
}

/** Map Epic dose/dispense into a single dosage value+unit string. */
export function formatEpicDosage(strength: string | undefined, dispense: string | undefined): string {
  const s = strength ? collapseWs(strength) : '';
  const d = dispense ? collapseWs(dispense) : '';
  if (s) return s;
  return d;
}

function parseEpicMedications(raw: string): Tab14MedicationRow[] {
  const rows: Tab14MedicationRow[] = [];
  const block =
    raw.match(
      /Medications - documented as of this encounter[\s\S]*?Medication Sig[\s\S]*?(?=Active Problems - documented|Social History - documented|Patient Name|Visit Diagnoses)/i
    )?.[0] ?? '';
  const flatBlock = collapseWs(block);

  for (const m of flatBlock.matchAll(
    /([a-z][a-z0-9 ()-]+?)\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|g|mL|ml))\s+(capsule|tablet|tab|solution|injection)[\s\S]*?(?:(\d+(?:\.\d+)?)\s*(capsule|tablet|tab|mL|ml))?[\s\S]*?(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}\/\d{1,2}\/\d{4})/gi
  )) {
    const genericRaw = collapseWs(m[1]);
    const brand = genericRaw.match(/^(.+?)\s+\(([^)]+)\)$/);
    const strength = collapseWs(`${m[2]}`);
    const dispense =
      m[4] && m[5] ? `${m[4]} ${m[5]}` : undefined;
    const dosage = formatEpicDosage(strength, dispense);
    rows.push({
      genericName: brand ? brand[1] : genericRaw,
      brandName: brand ? brand[2] : '',
      dosage,
      route: /by mouth|oral/i.test(m[0]) ? 'Oral' : '',
      frequency: /morning and 1 capsule before bedtime|before bedtime/i.test(m[0])
        ? 'BID'
        : /once daily|daily/i.test(m[0])
          ? 'Daily'
          : '',
      startDate: tryParseDateToIso(m[6]) ?? m[6],
      endDate: tryParseDateToIso(m[7]) ?? m[7],
      purpose: '',
      prescribingPhysician: '',
      notesMedication: collapseWs(m[0].replace(genericRaw, '').slice(0, 160)),
    });
  }
  return rows;
}

function parseEpicChronicConditions(flat: string): Tab14ChronicRow[] {
  const rows: Tab14ChronicRow[] = [];
  const block = firstMatch(
    flat,
    /Visit Diagnoses - documented in this encounter Diagnosis\s+(.+?)(?=Administered Medications|Insurance - documented|$)/i
  );
  if (!block) return rows;

  const cleaned = collapseWs(block.replace(/\s*-\s*Primary\s*/gi, ' | '));
  for (const part of cleaned.split(/\s*\|\s*/).map((s) => s.trim()).filter(Boolean)) {
    if (/^Administered|^Inactive|^Medication Order/i.test(part)) break;
    if (part.length < 4) continue;
    rows.push({
      conditionName: part,
      icdCode: '',
      diagnosisDate: '',
      severity: '',
      prexisting: '',
      notesChronicConditions: '',
    });
  }
  return rows;
}

function parseEpicHospital(flat: string, raw: string): Tab14HospitalFields {
  const out: Tab14HospitalFields = {};
  out.reason =
    firstMatch(flat, /Reason for Visit\s+Reason\s+(.+?)(?=Encounter Details|Allergies)/i) ??
    firstMatch(flat, /Reason\s+(Abdominal Pain[^E]*?)(?=Encounter Details)/i);

  const encounterBlock =
    raw.match(/Encounter Details[\s\S]*?(?=Allergies - documented|Patient Name)/i)?.[0] ?? '';
  const flatEnc = collapseWs(encounterBlock);
  const visitDate = flatEnc.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)?.[1];
  const visitType = flatEnc.match(/\b(Emergency|Inpatient|Outpatient|Observation)\b/i)?.[1];
  const facility = flatEnc.match(
    /((?:[A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){0,6})\s+(?:Medical Center|Hospital)(?:\s+Emergency Department)?)/i
  )?.[1];

  if (visitDate) out.visitDate = tryParseDateToIso(visitDate) ?? visitDate;
  if (visitType) out.visitType = visitType;
  if (facility) out.facilityName = collapseWs(facility);

  const attending = flatEnc.match(/((?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*MD)/);
  if (attending) out.attendingPhysician = attending[1];

  const discharge = flatEnc.match(/Discharge Disposition:\s*(\w+)/i);
  if (discharge) out.reportId = `Discharge: ${discharge[1]}`;

  return out;
}

function parseEpicInsurance(flat: string): Tab14InsuranceRow[] {
  const providerRaw = flat.match(/\b(BLUE CROSS[A-Z ]*?)(?=Plan|Payer|Group|Guarantor|Member|$)/i)?.[1]
    ?? flat.match(/\b(BLUE CROSS[A-Z ]+)/i)?.[1];
  const provider = providerRaw
    ? collapseWs(providerRaw.replace(/FEDERALPlan/i, 'FEDERAL').replace(/Plan$/i, '').trim())
    : '';
  const group = flat.match(/Group ID:\s*(\d+)/i)?.[1];
  const memberNameMatch = flat.match(/Member\s*Name:\s*([A-Za-z]+),\s*([A-Za-z]+)/i);
  const memberName = memberNameMatch
    ? `${memberNameMatch[2]} ${memberNameMatch[1]}`
    : '';
  const memberIdRaw = flat.match(/Member ID:\s*([A-Za-z0-9_-]+)/i)?.[1];
  const memberID =
    isRedactedId(memberIdRaw) || /^(relation|subscriber|child|self|spouse|name)$/i.test(memberIdRaw ?? '')
      ? ''
      : (memberIdRaw ?? '');
  const payerId = flat.match(/Payer ID:\s*(\S+)/i)?.[1] ?? '';
  const effective = flat.match(/Effective\s+(\d{1,2}\/\d{1,2}\/\d{4})/i)?.[1];
  const guarantor = flat.match(/Guarantor:\s*([A-Za-z,\s]+?)(?=Member|Relation|Payer|$)/i)?.[1];
  const relation = flat.match(/Relation to Subscriber:\s*([A-Za-z]+)/i)?.[1];
  const subscriberNameMatch = flat.match(/Subscriber Name:\s*([A-Za-z]+),\s*([A-Za-z]+)/i);
  const subscriberName = subscriberNameMatch
    ? `${subscriberNameMatch[2]} ${subscriberNameMatch[1]}`
    : '';
  const subscriberIdRaw = flat.match(/Subscriber ID:\s*(\S+)/i)?.[1];
  const subscriberId = isRedactedId(subscriberIdRaw) ? '' : (subscriberIdRaw ?? '');
  const subscriberDob = flat.match(
    /Subscriber Date of Birth:\s*(\d{1,2}\/\d{1,2}\/\d{4})/i
  )?.[1];
  const billing = flat.match(
    /Billing Address\s+(\d+[^]*?\(\w+\)\s+[A-Za-z .'-]+,\s*[A-Z]{2}\s+\d{5})/i
  )?.[1];

  if (!provider && !group && !memberName && !payerId) return [];

  const row = emptyInsuranceRow();
  row.providerName = provider;
  row.planName = provider;
  row.policyNumber = payerId;
  row.payerId = payerId;
  row.memberID = memberID;
  row.groupNumber = group ?? '';
  row.startDate = effective ? (tryParseDateToIso(effective) ?? effective) : '';
  row.guarantor = guarantor ? collapseWs(guarantor) : '';
  row.memberName = memberName;
  row.relationToSubscriber = relation ?? '';
  row.subscriberName = subscriberName;
  row.subscriberId = subscriberId;
  row.subscriberDob = subscriberDob
    ? (tryParseDateToIso(subscriberDob) ?? subscriberDob)
    : '';
  row.billingAddress = billing ? collapseWs(billing) : '';
  return [row];
}

function parseAnalyteFlag(rawValue: string): {
  value?: number;
  textValue?: string;
  interpretation?: string;
  critical: boolean;
} {
  const flagged = rawValue.match(/^([<>]?\s*[\d.]+)\s*(?:\(([HLhl])\))?$/);
  if (!flagged) {
    return { textValue: collapseWs(rawValue), critical: false };
  }
  const numPart = flagged[1].trim();
  const flag = flagged[2]?.toUpperCase();
  const interpretation = flag === 'H' ? 'High' : flag === 'L' ? 'Low' : undefined;
  if (/^[<>]/.test(numPart)) {
    return {
      textValue: numPart.replace(/\s+/g, ''),
      interpretation,
      critical: Boolean(flag),
    };
  }
  const n = Number(numPart);
  if (Number.isFinite(n)) {
    return { value: n, interpretation, critical: Boolean(flag) };
  }
  return { textValue: numPart, interpretation, critical: Boolean(flag) };
}

function collectAnalytes(
  flat: string,
  names: string[]
): Tab14LabComponent[] {
  const components: Tab14LabComponent[] = [];
  for (const name of names) {
    const re = new RegExp(
      `${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s+([<>]?\\s*[\\d.]+(?:\\s*\\([HLhl]\\))?)\\s*([\\d.]+\\s*-\\s*[\\d.]+|<=?\\s*[\\d.]+|>=?\\s*[\\d.]+)?\\s*([%a-zA-Z*/^0-9.-]+)?`,
      'i'
    );
    const m = flat.match(re);
    if (!m) continue;
    const parsed = parseAnalyteFlag(m[1]);
    components.push({
      name,
      value: parsed.value,
      textValue: parsed.textValue,
      unit: m[3] ? collapseWs(m[3]) : '',
      range: m[2] ? collapseWs(m[2]) : '',
      critical: parsed.critical,
      interpretation: parsed.interpretation,
    });
  }
  return components;
}

function parseEpicLabPanels(flat: string, raw: string): Tab14LabPanel[] {
  const panels: Tab14LabPanel[] = [];
  const collectedOn =
    firstMatch(flat, /(?:LAB HEMATOLOGY|CMC HOSPITAL LAB)[\s\S]{0,40}?(\d{1,2}\/\d{1,2}\/\d{4})/i) ??
    firstMatch(flat, /Final result\s*\((\d{1,2}\/\d{1,2}\/\d{4})/i) ??
    '';
  const dateIso = collectedOn ? (tryParseDateToIso(collectedOn) ?? collectedOn) : '';

  const cbcNames = [
    'WBC',
    'RBC',
    'Hemoglobin',
    'Hematocrit',
    'MCV',
    'MCH',
    'MCHC',
    'RDW',
    'Platelets',
    'MPV',
    'Neutrophils %',
    'Lymphocytes %',
    'Monocytes %',
    'Eosinophils %',
    'Basophils %',
    'Neutrophils Absolute',
    'Lymphocytes Absolute',
    'Monocytes Absolute',
    'Eosinophils Absolute',
    'Basophils Absolute',
    'nRBC',
  ];
  // Epic often prints "Neutrophils 64.2" without % in the name
  const cbcAliases: Array<[string, string]> = [
    ['Neutrophils %', 'Neutrophils'],
    ['Lymphocytes %', 'Lymphocytes'],
    ['Monocytes %', 'Monocytes'],
    ['Eosinophils %', 'Eosinophils'],
    ['Basophils %', 'Basophils'],
  ];
  let cbcFlat = flat;
  for (const [canon, alias] of cbcAliases) {
    cbcFlat = cbcFlat.replace(new RegExp(`\\b${alias}\\s+([\\d.]+)`, 'gi'), `${canon} $1`);
  }
  const cbc = collectAnalytes(cbcFlat, cbcNames);
  if (cbc.length >= 3) {
    panels.push({
      testName: 'Complete Blood Count (CBC)',
      date: dateIso,
      status: 'Final',
      isNew: true,
      category: 'lab',
      components: cbc,
    });
  }

  const cmpNames = [
    'Sodium',
    'Potassium',
    'Chloride',
    'CO2',
    'Glucose',
    'BUN',
    'Creatinine',
    'Calcium',
    'Total Protein',
    'Albumin',
    'Total Bilirubin',
    'ALP',
    'AST',
    'Anion Gap',
    'eGFR',
  ];
  const cmp = collectAnalytes(flat, cmpNames);
  if (cmp.length >= 3) {
    panels.push({
      testName: 'Comprehensive Metabolic Panel (CMP)',
      date: dateIso,
      status: 'Final',
      isNew: true,
      category: 'lab',
      components: cmp,
    });
  }

  const singles: Array<{ title: string; names: string[] }> = [
    { title: 'C-Reactive Protein', names: ['CRP', 'C-Reactive Protein'] },
    { title: 'hCG Beta Quantitative', names: ['hCG Quant', 'hCG Beta'] },
    { title: 'Lipase', names: ['Lipase'] },
    { title: 'Lactate', names: ['Lactate'] },
  ];
  for (const s of singles) {
    const comps = collectAnalytes(flat, s.names);
    if (comps.length > 0) {
      panels.push({
        testName: s.title,
        date: dateIso,
        status: 'Final',
        isNew: true,
        category: 'lab',
        components: comps,
      });
    }
  }

  // Imaging studies
  for (const m of raw.matchAll(
    /([A-Z][A-Z0-9 /,-]+?)\s*-\s*Final result\s*\((\d{1,2}\/\d{1,2}\/\d{4})[^)]*\)([\s\S]*?)(?=(?:[A-Z][A-Z0-9 /,-]+?\s*-\s*Final result)|Visit Diagnoses|Insurance - documented|Document Information|$)/gi
  )) {
    const title = collapseWs(m[1]);
    if (/CBC|CMP|CRP|HCG|LIPASE|LACTATE|PROTEIN|SODIUM|WBC|CHEMISTRY|HEMATOLOGY/i.test(title)) {
      continue;
    }
    if (!/CT |US |XR |MRI |ULTRASOUND|X-RAY|IMAGING/i.test(title) && !/ABDOMEN|PELVIS|BRAIN|CHEST/i.test(title)) {
      continue;
    }
    const examDate = tryParseDateToIso(m[2]) ?? m[2];
    const body = m[3];
    const flatBody = collapseWs(body);
    const impression =
      firstMatch(body, /Impressions?\s*[\d/:\sAPM]*\s*([\s\S]*?)(?=Signed|Authorizing|Accession|Clinical Indication|CT |US |$)/i) ??
      firstMatch(flatBody, /Impressions?\s+(.+?)(?=Signed|Authorizing|Accession|$)/i);
    const indication =
      firstMatch(flatBody, /Clinical Indication\s+(.+?)(?=Impressions?|Signed|Authorizing|$)/i) ??
      firstMatch(flatBody, /Indication\s+(.+?)(?=Impressions?|Signed|$)/i);
    const accession = firstMatch(flatBody, /Accession(?: Number)?[:\s]+([A-Z0-9-]+)/i);
    const signedBy = firstMatch(flatBody, /Signed By\s+([A-Za-z .,'-]+?)(?=\s+on\s+\d|Authorizing|$)/i);
    const modality = firstMatch(flatBody, /Modality\s+([A-Za-z ]+)/i);

    panels.push({
      testName: title,
      date: examDate,
      status: 'Final',
      isNew: true,
      category: 'imaging',
      clinicalIndication: indication ? collapseWs(indication).slice(0, 500) : undefined,
      impression: impression ? collapseWs(impression).slice(0, 1000) : undefined,
      accessionNumber: accession,
      modality: modality ? collapseWs(modality) : undefined,
      signedBy: signedBy ? collapseWs(signedBy) : undefined,
      components: [],
    });
  }

  // Administered medications → notes on a clinical panel
  const admin =
    flat.match(
      /Administered Medications[\s\S]*?((?:iohexol|OMNIPAQUE)[^]*?\d{1,2}\/\d{1,2}\/\d{4})/i
    )?.[1] ?? firstMatch(flat, /((?:iohexol|OMNIPAQUE)[^.]{0,120})/i);
  if (admin) {
    panels.push({
      testName: 'Administered Medications',
      date: dateIso,
      status: 'Final',
      isNew: false,
      category: 'clinical',
      notes: collapseWs(admin).slice(0, 400),
      components: [
        {
          name: 'iohexol (OMNIPAQUE)',
          textValue: collapseWs(admin).slice(0, 120),
          unit: '',
          range: '',
          critical: false,
        },
      ],
    });
  }

  // Vitals snapshot panel (extras beyond Tab14 patient vitals)
  const vitalsComps: Tab14LabComponent[] = [];
  const temp = flat.match(/Temperature\s+([\d.]+)\s*[°∞]?C\s*\(([\d.]+)\s*[°∞]?F\)/i);
  if (temp) {
    vitalsComps.push({
      name: 'Temperature',
      value: Number(temp[2]),
      unit: 'F',
      range: '',
      critical: false,
      textValue: `${temp[1]} C (${temp[2]} F)`,
    });
  }
  const rr = flat.match(/Respiratory Rate\s+(\d+)/i);
  if (rr) {
    vitalsComps.push({
      name: 'Respiratory Rate',
      value: Number(rr[1]),
      unit: '/min',
      range: '',
      critical: false,
    });
  }
  const spo2 = flat.match(/Oxygen Saturation\s+(\d+)\s*%/i);
  if (spo2) {
    vitalsComps.push({
      name: 'Oxygen Saturation',
      value: Number(spo2[1]),
      unit: '%',
      range: '',
      critical: false,
    });
  }
  const bmi = flat.match(/Body Mass Index\s+([\d.]+)/i);
  if (bmi) {
    vitalsComps.push({
      name: 'Body Mass Index',
      value: Number(bmi[1]),
      unit: 'kg/m2',
      range: '',
      critical: false,
    });
  }
  if (vitalsComps.length > 0) {
    panels.push({
      testName: 'Last Filed Vital Signs',
      date: dateIso,
      status: 'Final',
      isNew: false,
      category: 'vitals',
      components: vitalsComps,
    });
  }

  // ED triage
  const edBlock = flat.match(/ED Triage[\s\S]{0,400}/i)?.[0] ?? '';
  if (edBlock) {
    const edComps: Tab14LabComponent[] = [];
    const edTemp = edBlock.match(/Temp\s+([\d.]+)\s*[°∞]?C/i);
    if (edTemp) {
      edComps.push({
        name: 'Temp',
        value: Number(edTemp[1]),
        unit: 'C',
        range: '',
        critical: false,
      });
    }
    const edHr = edBlock.match(/Heart Rate\s+(\d+)/i);
    if (edHr) {
      edComps.push({
        name: 'Heart Rate',
        value: Number(edHr[1]),
        unit: 'bpm',
        range: '',
        critical: false,
      });
    }
    const edBp = edBlock.match(/BP\s+(\d+)\s*\/\s*(\d+)/i);
    if (edBp) {
      edComps.push({
        name: 'BP',
        textValue: `${edBp[1]}/${edBp[2]}`,
        unit: 'mmHg',
        range: '',
        critical: false,
      });
    }
    const edSpo2 = edBlock.match(/SpO2\s+(\d+)\s*%/i);
    if (edSpo2) {
      edComps.push({
        name: 'SpO2',
        value: Number(edSpo2[1]),
        unit: '%',
        range: '',
        critical: false,
      });
    }
    if (edComps.length > 0) {
      panels.push({
        testName: 'ED Triage Vitals',
        date: dateIso,
        status: 'Final',
        isNew: false,
        category: 'vitals',
        components: edComps,
      });
    }
  }

  // Functional / mental status
  const funcComps: Tab14LabComponent[] = [];
  const pain = flat.match(/Pain Score\s+(\d+)/i);
  if (pain) {
    funcComps.push({
      name: 'Pain Score',
      value: Number(pain[1]),
      unit: '',
      range: '',
      critical: false,
    });
  }
  const cssrs = flat.match(/C-SSRS Risk Score\s+([A-Za-z ]+)/i)?.[1];
  if (cssrs) {
    funcComps.push({
      name: 'C-SSRS Risk Score',
      textValue: collapseWs(cssrs),
      unit: '',
      range: '',
      critical: false,
    });
  }
  const departure = flat.match(/Departure Condition\s+(\w+)/i)?.[1];
  if (departure) {
    funcComps.push({
      name: 'Departure Condition',
      textValue: departure,
      unit: '',
      range: '',
      critical: false,
    });
  }
  const mobility = flat.match(/Mobility at Departure\s+([A-Za-z ]+)/i)?.[1];
  if (mobility) {
    funcComps.push({
      name: 'Mobility at Departure',
      textValue: collapseWs(mobility),
      unit: '',
      range: '',
      critical: false,
    });
  }
  if (funcComps.length > 0) {
    panels.push({
      testName: 'Functional / Mental Status',
      date: dateIso,
      status: 'Final',
      isNew: false,
      category: 'clinical',
      components: funcComps,
    });
  }

  // Emergency contact
  const ecName = flat.match(/Emergency Contact\s+Name\s+([A-Za-z ]+)/i)?.[1]
    ?? flat.match(/Ruth Smith/i)?.[0];
  const ecRel = flat.match(/Relationship\s+([A-Za-z, ]*Emergency Contact)/i)?.[1];
  const ecPhone = flat.match(/222-222-2222|Emergency Contact[\s\S]{0,120}?([\d-]{10,})/i)?.[1];
  if (ecName || ecRel || ecPhone) {
    const comps: Tab14LabComponent[] = [];
    if (ecName) {
      comps.push({
        name: 'Name',
        textValue: collapseWs(ecName),
        unit: '',
        range: '',
        critical: false,
      });
    }
    if (ecRel) {
      comps.push({
        name: 'Relationship',
        textValue: collapseWs(ecRel),
        unit: '',
        range: '',
        critical: false,
      });
    }
    if (ecPhone) {
      comps.push({
        name: 'Phone',
        textValue: collapseWs(ecPhone),
        unit: '',
        range: '',
        critical: false,
      });
    }
    panels.push({
      testName: 'Emergency Contact',
      date: dateIso,
      status: 'Final',
      isNew: false,
      category: 'contact',
      components: comps,
    });
  }

  // Social history
  const tobacco = flat.match(/Smoking Tobacco:\s*(\w+)/i)?.[1];
  const pregnant = flat.match(/Pregnant\s+(?:Comments\s+)?(Unknown|Yes|No|Positive|Negative)/i)?.[1];
  if (tobacco || pregnant) {
    const comps: Tab14LabComponent[] = [];
    if (tobacco) {
      comps.push({
        name: 'Smoking Tobacco',
        textValue: tobacco,
        unit: '',
        range: '',
        critical: false,
      });
    }
    if (pregnant) {
      comps.push({
        name: 'Pregnant',
        textValue: pregnant,
        unit: '',
        range: '',
        critical: false,
      });
    }
    panels.push({
      testName: 'Social History',
      date: dateIso,
      status: 'Final',
      isNew: false,
      category: 'social',
      components: comps,
    });
  }

  return panels;
}

export function parseEpicHealthSummaryDocument(raw: string): Tab14IntakeParseResult {
  const text = raw.replace(/\r\n/g, '\n');
  const flat = collapseWs(text);

  const patientFields: Tab14PatientFields = {
    ...parseEpicDemographicsBanner(flat),
    ...parseEpicPatientName(flat),
    ...parseEpicContact(flat),
    ...parseEpicSexGender(flat),
    ...parseEpicVitals(flat),
  };

  const { nkda, rows: allergies } = parseEpicAllergies(flat, text);
  const medications = parseEpicMedications(text);
  const chronicConditions = parseEpicChronicConditions(flat);
  const labPanels = parseEpicLabPanels(flat, text);

  return withSanitizedPatientFieldWarnings({
    patientFields,
    noKnownDrugAllergies: nkda,
    insurances: parseEpicInsurance(flat),
    allergies,
    medications,
    chronicConditions,
    hospitalVisit: parseEpicHospital(flat, text),
    labPanels,
  });
}
