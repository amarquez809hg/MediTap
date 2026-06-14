/**
 * Epic MyChart Patient Health Summary / Summary of Care exports (CCD-style).
 */

import { tryParseDateToIso } from './intakeDateParse';
import { collapseWs, splitPersonName } from './intakeFieldLabels';
import type {
  Tab14AllergyRow,
  Tab14ChronicRow,
  Tab14HospitalFields,
  Tab14InsuranceRow,
  Tab14IntakeParseResult,
  Tab14MedicationRow,
  Tab14PatientFields,
} from './tab14IntakeTypes';

function firstMatch(text: string, re: RegExp): string | undefined {
  return text.match(re)?.[1]?.trim();
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

function parseEpicPatientName(text: string): Tab14PatientFields {
  const out: Tab14PatientFields = {};
  const labeled = text.match(/Patient Name\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\s+Communication/i);
  const shared = text.match(/shared with\s+([A-Za-z]+(?:\s+[A-Za-z]+)?)\./i);
  const full = (labeled?.[1] ?? shared?.[1] ?? '').trim();
  if (full) {
    const split = splitPersonName(full);
    if (split.given) out.givenName = split.given;
    if (split.family) out.familyName = split.family;
  }
  return out;
}

function parseEpicDemographicsBanner(text: string): Tab14PatientFields {
  const out: Tab14PatientFields = {};
  const m = text.match(
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

function parseEpicContact(text: string): Tab14PatientFields {
  const out: Tab14PatientFields = {};

  const addr = text.match(
    /Patient Address\s+(\d+[^(\n]+?\(\w+\)\s+[A-Za-z .'-]+,\s*[A-Z]{2}\s+\d{5})/i
  );
  if (addr) out.address = collapseWs(addr[1]);

  const phone = text.match(/Communication\s+([\d()-\s]{7,18})\s*\(\s*Mobile\s*\)/i);
  if (phone) out.phoneNumber = collapseWs(phone[1]);

  const email = text.match(
    /Communication[\s\d()-]*(?:Mobile|Home|Work)[^@]*?([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i
  );
  if (email) out.email = email[1];

  return out;
}

function parseEpicVitals(text: string): Tab14PatientFields {
  const out: Tab14PatientFields = {};
  const height = text.match(/Height\s+[\d.]+\s*cm\s*\((\d+)'\s*(\d+)"/i);
  if (height) {
    const inches = Number(height[1]) * 12 + Number(height[2]);
    if (inches > 0) out.heightInches = String(inches);
  }
  const weight = text.match(/Weight\s+[\d.]+\s*kg\s*\((\d+(?:\.\d+)?)\s*lb\)/i);
  if (weight) out.weightLbs = weight[1];
  return out;
}

function parseEpicAllergies(text: string): { nkda: boolean; rows: Tab14AllergyRow[] } {
  const nkda = /No known active allergies/i.test(text);
  return { nkda, rows: [] };
}

function parseEpicMedications(text: string): Tab14MedicationRow[] {
  const rows: Tab14MedicationRow[] = [];
  const block =
    text.match(
      /Medications - documented as of this encounter[\s\S]*?Medication Sig[\s\S]*?(?=Active Problems - documented|Social History - documented|Patient Name|Visit Diagnoses)/i
    )?.[0] ?? '';

  for (const m of block.matchAll(
    /([a-z][a-z0-9 ()-]+?)\s+(\d+(?:\.\d+)?\s*(?:mg|mcg|g))\s+(capsule|tablet|tab|solution|injection)[^]*?(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}\/\d{1,2}\/\d{4})/gi
  )) {
    const genericRaw = collapseWs(m[1]);
    const brand = genericRaw.match(/^(.+?)\s+\(([^)]+)\)$/) ;
    rows.push({
      genericName: brand ? brand[1] : genericRaw,
      brandName: brand ? brand[2] : '',
      dosage: collapseWs(m[2]),
      route: /by mouth|oral/i.test(m[0]) ? 'Oral' : '',
      frequency: /morning and 1 capsule before bedtime/i.test(m[0])
        ? 'BID'
        : /once daily|daily/i.test(m[0])
          ? 'Daily'
          : '',
      startDate: tryParseDateToIso(m[4]) ?? m[4],
      endDate: tryParseDateToIso(m[5]) ?? m[5],
      purpose: '',
      prescribingPhysician: '',
      notesMedication: collapseWs(m[0].replace(genericRaw, '').slice(0, 120)),
    });
  }
  return rows;
}

function parseEpicChronicConditions(text: string): Tab14ChronicRow[] {
  const rows: Tab14ChronicRow[] = [];
  const block = firstMatch(
    text,
    /Visit Diagnoses - documented in this encounter Diagnosis\s+(.+?)(?=Administered Medications|Insurance - documented|$)/is
  );
  if (!block) return rows;

  const cleaned = collapseWs(block.replace(/\s*-\s*Primary\s*/i, ' | '));
  for (const part of cleaned.split(/\s*\|\s*|\s{2,}/).map((s) => s.trim()).filter(Boolean)) {
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

function parseEpicHospital(text: string): Tab14HospitalFields {
  const out: Tab14HospitalFields = {};
  out.reason =
    firstMatch(text, /Reason for Visit\s+Reason\s+(.+?)(?=Encounter Details|Allergies)/i) ??
    firstMatch(text, /Reason\s+(Abdominal Pain[^E]*?)(?=Encounter Details)/i);

  const encounterBlock = text.match(/Encounter Details[\s\S]*?(?=Allergies - documented|Patient Name)/i)?.[0] ?? '';
  const visitDate = encounterBlock.match(/(\d{1,2}\/\d{1,2}\/\d{4})/)?.[1];
  const visitType = encounterBlock.match(/\b(Emergency|Inpatient|Outpatient|Observation)\b/i)?.[1];
  const facility = encounterBlock.match(
    /((?:[A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){0,6})\s+(?:Medical Center|Hospital)(?:\s+Emergency Department)?[\s\S]*?\b\d{5}\b)/i
  )?.[1];

  if (visitDate) out.visitDate = tryParseDateToIso(visitDate) ?? visitDate;
  if (visitType) out.visitType = visitType;
  if (facility) {
    out.facilityName = collapseWs(
      facility.replace(/\s+\d{3}[-.\s]?\d{3}[-.\s]?\d{4}.*$/i, '').replace(/\s+\d{10,}.*$/i, '')
    );
  }

  const attending = encounterBlock.match(/((?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?),\s*MD)/);
  if (attending) out.attendingPhysician = attending[1];

  const discharge = encounterBlock.match(/Discharge Disposition:\s*(\w+)/i);
  if (discharge) out.reportId = `Discharge: ${discharge[1]}`;

  return out;
}

function parseEpicInsurance(text: string): Tab14InsuranceRow[] {
  const provider = text.match(/\b(BLUE CROSS[A-Z ]*)/i)?.[1];
  const group = text.match(/Group ID:\s*(\d+)/i)?.[1];
  const member = text.match(/Member Name:\s*([A-Za-z]+),\s*([A-Za-z]+)/i);
  const memberId = text.match(/Member ID:\s*(\S+)/i)?.[1];
  const payerId = text.match(/Payer ID:\s*(\S+)/i)?.[1];
  const effective = text.match(/Effective\s+(\d{1,2}\/\d{1,2}\/\d{4})/i)?.[1];

  if (!provider && !group && !member) return [];

  return [
    {
      providerName: provider ? collapseWs(provider) : '',
      policyNumber: payerId ?? '',
      planName: provider ? collapseWs(provider) : '',
      memberID: memberId ?? '',
      groupNumber: group ?? '',
      startDate: effective ? (tryParseDateToIso(effective) ?? effective) : '',
      endDate: '',
    },
  ];
}

export function parseEpicHealthSummaryDocument(raw: string): Tab14IntakeParseResult {
  const text = raw.replace(/\r\n/g, '\n');
  const patientFields: Tab14PatientFields = {
    ...parseEpicDemographicsBanner(text),
    ...parseEpicPatientName(text),
    ...parseEpicContact(text),
    ...parseEpicVitals(text),
  };

  const { nkda, rows: allergies } = parseEpicAllergies(text);
  const medications = parseEpicMedications(text);
  const chronicConditions = parseEpicChronicConditions(text);

  return {
    patientFields,
    noKnownDrugAllergies: nkda,
    insurances: parseEpicInsurance(text),
    allergies,
    medications,
    chronicConditions,
    hospitalVisit: parseEpicHospital(text),
  };
}
