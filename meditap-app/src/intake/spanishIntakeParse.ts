/**
 * Parser for MediTap Spanish demo / intake PDFs (Registro Médico).
 */

import { tryParseDateToIso } from './intakeDateParse';
import { collapseWs, escapeRe, normalizeBloodType } from './intakeFieldLabels';
import type {
  Tab14AllergyRow,
  Tab14ChronicRow,
  Tab14HospitalFields,
  Tab14InsuranceRow,
  Tab14IntakeParseResult,
  Tab14MedicationRow,
  Tab14PatientFields,
} from './tab14IntakeTypes';

const ICD_RE = /\(([A-TV-Z]\d{2}(?:\.\d+)?[A-Z0-9]{0,4})\)/;

function cleanValue(v: string): string {
  return collapseWs(v.replace(/\*+$/g, '').trim());
}

function mapSpanishSex(raw: string): string | undefined {
  const v = collapseWs(raw).toLowerCase();
  if (/^masculino|^male|^hombre/.test(v)) return 'Male';
  if (/^femenino|^female|^mujer/.test(v)) return 'Female';
  return undefined;
}

/** PDF text often glues section headers to values (DATOS DEMOGRÁFICOSNombre:). */
export function preprocessSpanishGluedText(text: string): string {
  const breaks = [
    'DATOS DEMOGRÁFICOS',
    'DATOS DEMOGRAFICOS',
    'ALERGIAS',
    'SEGURO MÉDICO',
    'SEGURO MEDICO',
    'VISITAS MÉDICAS',
    'VISITAS MEDICAS',
    'MEDICAMENTOS',
    'CONDICIONES CRÓNICAS',
    'CONDICIONES CRONICAS',
    'RESULTADOS DE LABORATORIO',
    'Nombre:',
    'Apellido:',
    'Fecha de nacimiento:',
    'Sexo al nacer:',
    'Sexo:',
    'Tipo de sangre:',
    'Correo electrónico:',
    'Correo electronico:',
    'Teléfono:',
    'Telefono:',
    'Dirección:',
    'Direccion:',
    'Raza:',
    'Etnicidad:',
    'Idioma preferido:',
    'Estado civil:',
    'Proveedor:',
    'Número de póliza:',
    'Numero de poliza:',
    'Plan:',
    'ID de miembro:',
    'Número de grupo:',
    'Numero de grupo:',
    'Vigencia:',
  ];
  let t = text.replace(/\r\n/g, '\n');
  for (const label of breaks.sort((a, b) => b.length - a.length)) {
    const re = new RegExp(`(\\S)\\s*(?=${escapeRe(label)})`, 'gi');
    t = t.replace(re, '$1\n');
    t = t.replace(new RegExp(`(${escapeRe(label)})(?=\\S)`, 'gi'), '$1\n');
  }
  t = t.replace(/ALERGIAS(\d+\.)/gi, 'ALERGIAS\n$1');
  t = t.replace(/MEDICAMENTOS([A-Za-zÁÉÍÓÚáéíóú])/gi, 'MEDICAMENTOS\n$1');
  t = t.replace(/CONDICIONES CR[ÓO]NICAS([A-Za-zÁÉÍÓÚáéíóú])/gi, 'CONDICIONES CRÓNICAS\n$1');
  t = t.replace(/VISITAS M[ÉE]DICAS(\d)/gi, 'VISITAS MÉDICAS\n$1');
  return t.replace(/\n{3,}/g, '\n\n');
}

export function isSpanishMediTapRegistroDocument(text: string): boolean {
  const t = text.replace(/\s+/g, ' ');
  return (
    /Registro M[ée]dico/i.test(t) ||
    (/DATOS DEMOGR[ÁA]FICOS/i.test(t) &&
      (/Nombre:/i.test(t) || /Apellido:/i.test(t)) &&
      /(?:ALERGIAS|MEDICAMENTOS|CONDICIONES CR[ÓO]NICAS)/i.test(t))
  );
}

function labelValue(text: string, pattern: RegExp): string | undefined {
  const m = text.match(pattern);
  if (!m?.[1]) return undefined;
  const v = cleanValue(m[1]);
  return v || undefined;
}

function parsePatientFields(text: string): Tab14PatientFields {
  const out: Tab14PatientFields = {};
  const given = labelValue(text, /Nombre:\s*([^\n]+)/i);
  const family = labelValue(text, /Apellido:\s*([^\n]+)/i);
  if (given) out.givenName = given;
  if (family) out.familyName = family;

  const dobRaw = labelValue(text, /Fecha de nacimiento:\s*([^\n]+)/i);
  if (dobRaw) {
    const iso = tryParseDateToIso(dobRaw);
    if (iso) out.dateOfBirth = iso;
  }

  const sexRaw = labelValue(text, /Sexo al nacer:\s*([^\n]+)/i) ?? labelValue(text, /Sexo:\s*([^\n]+)/i);
  const sex = sexRaw ? mapSpanishSex(sexRaw) : undefined;
  if (sex) out.sexAtBirth = sex;

  const btRaw = labelValue(text, /Tipo de sangre:\s*([^\n]+)/i);
  const bt = btRaw ? normalizeBloodType(btRaw) : undefined;
  if (bt) out.bloodType = bt;

  const email = labelValue(text, /Correo electr[oó]nico:\s*([^\n]+)/i);
  if (email && /@/.test(email)) out.email = email;

  const phone = labelValue(text, /Tel[eé]fono:\s*([^\n]+)/i);
  if (phone) out.phoneNumber = phone;

  const address = labelValue(text, /Direcci[oó]n:\s*([^\n]+)/i);
  if (address) out.address = address;

  const race = labelValue(text, /Raza:\s*([^\n]+)/i);
  if (race) out.race = race;

  const ethnicity = labelValue(text, /Etnicidad:\s*([^\n]+)/i);
  if (ethnicity) out.ethnicity = ethnicity;

  const lang = labelValue(text, /Idioma preferido:\s*([^\n]+)/i);
  if (lang) out.preferredLanguage = lang;

  const marital = labelValue(text, /Estado civil:\s*([^\n]+)/i);
  if (marital) out.maritalStatus = marital;

  return out;
}

function parseAllergies(text: string): Tab14AllergyRow[] {
  const block = text.match(/ALERGIAS\s*([\s\S]*?)(?=SEGURO M[ÉE]DICO|VISITAS|MEDICAMENTOS|CONDICIONES|$)/i)?.[1] ?? '';
  const rows: Tab14AllergyRow[] = [];
  for (const line of block.split('\n')) {
    const trimmed = line.trim();
    const m = trimmed.match(/^\d+\.\s*(.+?)(?:\s*[—–-]\s*Reacci[oó]n:\s*(.+?))?(?:\s*[—–-]\s*Gravedad:\s*(.+?))?(?:\s*[—–-]\s*Estado:\s*(.+))?$/i);
    if (!m) continue;
    const name = cleanValue(m[1].split(/\s*[—–-]\s*Reacci[oó]n:/i)[0]);
    if (!name || name.length < 2) continue;
    rows.push({
      allergyName: name,
      allergyType: /polen|ambient/i.test(name) ? 'Environmental' : /penicilina|medic/i.test(name) ? 'Drug' : '',
      allergyTypeOther: '',
      severity: m[3]?.trim() ?? '',
      reactionNotes: m[2]?.trim() ?? '',
      lastObserved: '',
    });
  }
  return rows;
}

function parseInsurance(text: string): Tab14InsuranceRow[] {
  const block = text.match(/SEGURO M[ÉE]DICO\s*([\s\S]*?)(?=VISITAS M[ÉE]DICAS|MEDICAMENTOS|CONDICIONES|$)/i)?.[1] ?? '';
  const provider = labelValue(block, /Proveedor:\s*([^\n]+)/i);
  const policy = labelValue(block, /N[úu]mero de p[oó]liza:\s*([^\n]+)/i);
  const plan = labelValue(block, /Plan:\s*([^\n]+)/i);
  const member = labelValue(block, /ID de miembro:\s*([^\n]+)/i);
  const group = labelValue(block, /N[úu]mero de grupo:\s*([^\n]+)/i);
  if (!provider && !policy && !member) return [];
  return [
    {
      providerName: provider ?? '',
      policyNumber: policy ?? '',
      planName: plan ?? '',
      memberID: member ?? '',
      groupNumber: group ?? '',
      startDate: '',
      endDate: '',
    },
  ];
}

function parseHospitalVisits(text: string): Tab14HospitalFields {
  const block = text.match(/VISITAS M[ÉE]DICAS\s*([\s\S]*?)(?=MEDICAMENTOS|CONDICIONES|$)/i)?.[1] ?? '';
  const line = block.split('\n').map((l) => l.trim()).find((l) => /\d{1,2}\/\d{1,2}\/\d{4}/.test(l));
  if (!line) return {};
  const m = line.match(/^(\d{1,2}\/\d{1,2}\/\d{4})\s*[—–-]\s*(.+?)(?:\.\s*M[eé]dico:|Profesional:)\s*(.+)$/i);
  if (!m) {
    const parts = line.match(/^(\d{1,2}\/\d{1,2}\/\d{4})\s*[—–-]\s*(.+)$/);
    if (!parts) return {};
    return {
      visitDate: tryParseDateToIso(parts[1]) ?? parts[1],
      reason: parts[2].trim(),
      visitType: 'Visita médica',
    };
  }
  return {
    visitDate: tryParseDateToIso(m[1]) ?? m[1],
    dischargeDate: tryParseDateToIso(m[1]) ?? m[1],
    reason: m[2].trim(),
    attendingPhysician: m[3].trim(),
    visitType: 'Visita médica',
  };
}

function parseMedications(text: string): Tab14MedicationRow[] {
  const block = text.match(/MEDICAMENTOS\s*([\s\S]*?)(?=CONDICIONES CR[ÓO]NICAS|RESULTADOS|$)/i)?.[1] ?? '';
  const rows: Tab14MedicationRow[] = [];
  for (const line of block.split('\n')) {
    const trimmed = line.trim();
    const m = trimmed.match(/^([A-Za-zÁÉÍÓÚáéíóú][A-Za-zÁÉÍÓÚáéíóú\s-]+?)\s+(\d+(?:\.\d+)?\s*mg)\s*:\s*(.+)$/i);
    if (!m) continue;
    const freq = m[3].match(/\b(una vez al d[ií]a|seg[uú]n sea necesario|al inicio de migra[nñ]a|antes del desayuno|diario|prn)\b/i);
    rows.push({
      genericName: collapseWs(m[1]),
      brandName: '',
      dosage: m[2].trim(),
      route: 'Oral',
      frequency: freq?.[1] ?? m[3].trim(),
      startDate: '',
      endDate: '',
      purpose: '',
      prescribingPhysician: '',
      notesMedication: m[3].trim(),
    });
  }
  return rows;
}

function parseChronicConditions(text: string): Tab14ChronicRow[] {
  const block = text.match(/CONDICIONES CR[ÓO]NICAS\s*([\s\S]*?)(?=RESULTADOS DE LABORATORIO|$)/i)?.[1] ?? '';
  const chunks = block
    .split(/\n|(?<=\))\s+(?=[A-ZÁÉÍÓÚÑ])/)
    .map((s) => s.trim())
    .filter(Boolean);
  const rows: Tab14ChronicRow[] = [];
  for (const trimmed of chunks) {
    const icd = trimmed.match(ICD_RE);
    const name = trimmed.replace(ICD_RE, '').replace(/^[-•*\d.)]+\s*/, '').trim();
    if (!name || name.length < 3) continue;
    rows.push({
      conditionName: name,
      icdCode: icd?.[1] ?? '',
      diagnosisDate: '',
      severity: '',
      prexisting: '',
      notesChronicConditions: '',
    });
  }
  return rows;
}

export function parseSpanishMediTapRegistroDocument(raw: string): Tab14IntakeParseResult {
  const text = preprocessSpanishGluedText(raw);
  const hospitalVisit = parseHospitalVisits(text);
  return {
    patientFields: parsePatientFields(text),
    noKnownDrugAllergies: false,
    insurances: parseInsurance(text),
    allergies: parseAllergies(text),
    medications: parseMedications(text),
    chronicConditions: parseChronicConditions(text),
    hospitalVisit,
  };
}
