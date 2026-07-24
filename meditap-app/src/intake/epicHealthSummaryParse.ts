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
  const isEmergencyEmail = (e: string) => /emergency/i.test(e);
  const patientEmails = unique.filter((e) => !isEmergencyEmail(e));
  const emergencyEmails = unique.filter((e) => isEmergencyEmail(e));
  if (patientEmails[0]) out.email = patientEmails[0];
  if (patientEmails.length > 1) out.additionalEmails = patientEmails.slice(1);
  if (emergencyEmails[0]) out.emergencyContactEmail = emergencyEmails[0];

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

  const temp = flat.match(
    /Temperature\s+([\d.]+)\s*[°∞]?C\s*\(([\d.]+)\s*[°∞]?F\)/i
  );
  if (temp) {
    out.temperatureC = temp[1];
    out.temperatureF = temp[2];
  }
  const rr = flat.match(/Respiratory Rate\s+(\d+)/i);
  if (rr) out.respiratoryRate = rr[1];
  const spo2 = flat.match(/Oxygen Saturation\s+(\d+)\s*%/i);
  if (spo2) out.oxygenSaturation = spo2[1];
  const bmi = flat.match(/Body Mass Index\s+([\d.]+)/i);
  if (bmi) out.bodyMassIndex = bmi[1];

  return out;
}

function parseEpicEmergencyContact(flat: string): Tab14PatientFields {
  const out: Tab14PatientFields = {};
  const name =
    flat.match(/Contact Name\s+([A-Za-z][A-Za-z .'-]+?)(?=\s+Communication|\s+Copyright|\s+Subscriber|$)/i)?.[1] ??
    flat.match(/Emergency Contact[\s\S]{0,80}?Contact Name\s+([A-Za-z][A-Za-z .'-]+)/i)?.[1];
  if (name) {
    const split = splitPersonName(name);
    if (split.given) out.emergencyContactGivenName = split.given;
    if (split.family) out.emergencyContactFamilyName = split.family;
  }

  const relationship = flat.match(
    /Relationship to Patient\s+\w+\s+((?:Mother|Father|Spouse|Sibling|Friend|Guardian|Other)[^]*?Emergency Contact)/i
  )?.[1];
  if (relationship) {
    out.emergencyContactRelationship = collapseWs(relationship);
  } else {
    const relAlt = flat.match(
      /\b((?:Mother|Father|Spouse|Sibling|Friend|Guardian),\s*Emergency Contact)\b/i
    )?.[1];
    if (relAlt) out.emergencyContactRelationship = collapseWs(relAlt);
  }

  const phone =
    flat.match(
      /Contact Name\s+[A-Za-z .'-]+\s+Communication\s+([\d()-\s]{7,20})\s*\(\s*Mobile\s*\)/i
    )?.[1] ??
    flat.match(/Emergency Contact[\s\S]{0,160}?Communication\s+([\d()-\s]{7,20})/i)?.[1];
  if (phone) out.emergencyContactPhone = collapseWs(phone);

  const email =
    flat.match(
      /Contact Name\s+[A-Za-z .'-]+[\s\S]{0,120}?([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i
    )?.[1] ??
    flat.match(/([A-Z0-9._%+-]*emergency[A-Z0-9._%+-]*@[A-Z0-9.-]+\.[A-Z]{2,})/i)?.[1];
  if (email) out.emergencyContactEmail = email;

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
    const genericRaw = collapseWs(m[1])
      .replace(
        /^(?:Medication\s+Sig(?:Dispense)?(?:\s*Quantity)?(?:\s*Last Filled)?(?:\s*Start Date)?(?:\s*End Date)?(?:\s*Status)?\s*)/i,
        ''
      )
      .trim();
    if (!genericRaw || /^(?:Sig|Dispense|Quantity|Status)$/i.test(genericRaw)) continue;
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

/** Contrast / MAR-administered meds from the encounter (e.g. iohexol). */
function parseEpicAdministeredMedications(raw: string): Tab14MedicationRow[] {
  const rows: Tab14MedicationRow[] = [];
  const block =
    raw.match(
      /Administered Medications[\s\S]*?(?=Insurance - documented|Account Type|Document Information|BLUE CROSS|$)/i
    )?.[0] ?? '';
  if (!block) return rows;
  const flatBlock = collapseWs(block);

  for (const m of flatBlock.matchAll(
    /([a-z][a-z0-9-]*)\s*\(([^)]+)\)\s+(\d+(?:\.\d+)?\s*mg(?:\s+iodine\/mL)?)\s+injection\s+(\d+(?:\.\d+)?\s*mL)(?:\s+\4)?[^]*?(intravenous|IV|oral|by mouth)?[^]*?(?:Given\s+(\d{1,2}\/\d{1,2}\/\d{4}))?/gi
  )) {
    const routeRaw = m[5] ?? '';
    const route = /intravenous|^IV$/i.test(routeRaw)
      ? 'IV'
      : /oral|by mouth/i.test(routeRaw)
        ? 'Oral'
        : routeRaw
          ? collapseWs(routeRaw)
          : 'IV';
    rows.push({
      genericName: collapseWs(m[1]),
      brandName: collapseWs(m[2]),
      dosage: collapseWs(m[4]),
      route,
      frequency: /Once|once/i.test(m[0]) ? 'Once' : '',
      startDate: m[6] ? (tryParseDateToIso(m[6]) ?? m[6]) : '',
      endDate: '',
      purpose: 'Imaging contrast / administered',
      prescribingPhysician: '',
      notesMedication: collapseWs(m[0]).slice(0, 220),
    });
  }

  if (rows.length === 0) {
    const loose = flatBlock.match(
      /((?:iohexol|OMNIPAQUE)[^]*?\d+(?:\.\d+)?\s*mL[^]*?(?:intravenous|IV)?[^]*?(?:\d{1,2}\/\d{1,2}\/\d{4})?)/i
    )?.[1];
    if (loose) {
      const brand = loose.match(/\(([^)]+)\)/)?.[1] ?? 'OMNIPAQUE';
      const dose = loose.match(/(\d+(?:\.\d+)?\s*mL)/i)?.[1] ?? '';
      const given = loose.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)?.[1];
      rows.push({
        genericName: 'iohexol',
        brandName: collapseWs(brand),
        dosage: dose,
        route: 'IV',
        frequency: 'Once',
        startDate: given ? (tryParseDateToIso(given) ?? given) : '',
        endDate: '',
        purpose: 'Imaging contrast / administered',
        prescribingPhysician: '',
        notesMedication: collapseWs(loose).slice(0, 220),
      });
    }
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

  // Imaging studies — match exam modality titles only (avoid "Results …" / provider preamble pollution).
  const seenImaging = new Set<string>();
  for (const m of raw.matchAll(
    /\b((?:CT|US|XR|MRI)\s+[A-Z0-9 /,-]+?)\s*-\s*Final result\s*\((\d{1,2}\/\d{1,2}\/\d{4})[^)]*\)([\s\S]*?)(?=\b(?:CT|US|XR|MRI)\s+[A-Z0-9 /,-]+?\s*-\s*Final result\b|Visit Diagnoses|Insurance - documented|Document Information|Tick Panel|CBC W\/|COMPREHENSIVE METABOLIC|C-REACTIVE|HCG BETA|LIPASE|LACTIC ACID|MICRO URINE|URINALYSIS|Urine Culture|$)/gi
  )) {
    const examMatches = [
      ...collapseWs(m[1])
        .toUpperCase()
        .matchAll(/\b((?:CT|US|XR|MRI)\s+(?!PROCEDURES\b)[A-Z0-9 /,-]+)/g),
    ];
    let title = examMatches.length
      ? collapseWs(examMatches[examMatches.length - 1][1])
      : collapseWs(m[1]).toUpperCase();
    title = title
      .replace(/^(?:RESULTS(?:\s*-\s*DOCUMENTED IN THIS ENCOUNTER)?\s+)/i, '')
      .replace(/\s+(?:FINAL RESULT|PROCEDURES|ORDERABLES).*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (
      !title ||
      /CBC|CMP|CRP|HCG|LIPASE|LACTATE|PROTEIN|SODIUM|WBC|CHEMISTRY|HEMATOLOGY|URINE|TICK|LYME|PREGNANCY|PROCEDURES/i.test(
        title
      )
    ) {
      continue;
    }
    const examDate = tryParseDateToIso(m[2]) ?? m[2];
    const dedupeKey = `${title}|${examDate}`;
    if (seenImaging.has(dedupeKey)) continue;
    seenImaging.add(dedupeKey);

    const body = m[3];
    const flatBody = collapseWs(body);
    const impression =
      firstMatch(
        body,
        /Impressions?\s*[\d/:\sAPM]*\s*([\s\S]*?)(?=Signed|Authorizing|Accession|Clinical Indication|Narrative|CT |US |$)/i
      ) ??
      firstMatch(flatBody, /Impressions?\s+(.+?)(?=Signed|Authorizing|Accession|Narrative|$)/i) ??
      firstMatch(
        flatBody,
        /IMPRESSION:\s*(.+?)(?=Signed|Authorizing|Dictated|THIS DOCUMENT|Narrative|$)/i
      );
    const indication =
      firstMatch(flatBody, /Clinical [Ii]ndication:\s*(.+?)(?=TECHNIQUE|Impressions?|Signed|Authorizing|$)/i) ??
      firstMatch(flatBody, /Clinical Indication\s+(.+?)(?=Impressions?|Signed|Authorizing|TECHNIQUE|$)/i) ??
      firstMatch(flatBody, /Indication\s+(.+?)(?=Impressions?|Signed|TECHNIQUE|$)/i);
    const accession = firstMatch(flatBody, /Accession(?: Number)?[:\s]+([A-Z0-9-]+)/i);
    const signedBy =
      firstMatch(flatBody, /ELECTRONICALLY SIGNED BY[^\n]*?([A-Z][A-Za-z .,'-]+?,\s*MD)/i) ??
      firstMatch(flatBody, /Signed By\s+([A-Za-z .,'-]+?)(?=\s+on\s+\d|Authorizing|$)/i) ??
      firstMatch(flatBody, /Dictated and Authenticated by:\s*([A-Za-z .,'-]+?)(?:\s+MD)?\s+\d/i);
    const modality =
      firstMatch(flatBody, /Modality\s+([A-Za-z ]+?)(?=\s+Specimen|\s+Anatomical|$)/i) ??
      (/^CT\b/i.test(title)
        ? 'Computed Tomography'
        : /^US\b/i.test(title)
          ? 'Ultrasound'
          : undefined);

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

  // Functional / mental status (scoped to encounter Functional Status block — not global vitals noise)
  const funcBlock =
    raw.match(
      /Functional Status[\s\S]*?(?=Mental Status - documented|Discharge Instructions|Visit Diagnoses|Insurance - documented|$)/i
    )?.[0] ??
    flat.match(/Functional Status[\s\S]{0,3500}/i)?.[0] ??
    '';
  const funcFlat = collapseWs(funcBlock);
  if (funcFlat) {
    const funcComps: Tab14LabComponent[] = [];
    const pain = funcFlat.match(/Pain Score\s+(\d+)/i);
    if (pain) {
      funcComps.push({
        name: 'Pain Score',
        value: Number(pain[1]),
        unit: '',
        range: '',
        critical: false,
      });
    }
    const cssrs =
      funcFlat.match(
        /Calculated C-SSRS Risk Score[^]*?Author\s+(No Risk Indicated|[A-Za-z ]+?)(?=\s+\d{1,2}\/|\s+Columbia|\s+Pain|\s+Departure|$)/i
      )?.[1] ??
      funcFlat.match(/Calculated C-SSRS Risk Score[^]*?(No Risk Indicated)/i)?.[1];
    if (cssrs) {
      funcComps.push({
        name: 'C-SSRS Risk Score',
        textValue: collapseWs(cssrs),
        unit: '',
        range: '',
        critical: false,
      });
    }
    const departure = funcFlat.match(
      /Departure Condition\s+(Good|Fair|Poor|Critical)\b/i
    )?.[1];
    if (departure) {
      funcComps.push({
        name: 'Departure Condition',
        textValue: departure,
        unit: '',
        range: '',
        critical: false,
      });
    }
    const mobility = funcFlat.match(
      /Mobility at Departure\s+(Ambulatory|Wheelchair|Stretcher|[A-Za-z]+)/i
    )?.[1];
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
  }

  // Vitals, administered meds, emergency contact, and social history are routed elsewhere
  // (patient vitals / medications / patient information) — not emitted as lab panels.

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
    ...parseEpicEmergencyContact(flat),
  };

  const { nkda, rows: allergies } = parseEpicAllergies(flat, text);
  const outpatientMeds = parseEpicMedications(text);
  const administeredMeds = parseEpicAdministeredMedications(text);
  const medications = [...outpatientMeds];
  for (const admin of administeredMeds) {
    const already = medications.some(
      (m) =>
        m.genericName.toLowerCase() === admin.genericName.toLowerCase() &&
        collapseWs(m.dosage).toLowerCase() === collapseWs(admin.dosage).toLowerCase()
    );
    if (!already) medications.push(admin);
  }
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
