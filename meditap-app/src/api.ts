import API_BASE from './config/api';
import { getKeycloak } from './config/keycloak';
import { getAuthHeaders } from './auth/getAuthHeaders';
import { emitSessionExpired } from './auth/sessionEvents';
import { getMeditapElevationRequestHeaders } from './auth/staffElevationStorage';
import type { IncidentRecord } from './incidents/incidentModel';

type Paginated<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

export type PatientApi = {
  patient_id: string;
  given_name: string;
  family_name: string;
  date_of_birth: string;
  blood_type: string | null;
  sex_at_birth: string | null;
  email: string | null;
  phone: string | null;
};

export type AllergyCatalogApi = { allergy_id: string; name: string };
export type PatientAllergyApi = {
  id?: number;
  patient: string;
  allergy: string;
  severity: string | null;
  reaction_notes: string | null;
};

export type MedicationCatalogApi = {
  medication_id: string;
  generic_name: string;
  brand_name: string | null;
};
export type PatientMedicationApi = {
  id?: number;
  patient: string;
  medication: string;
  dosage: string | null;
  route: string | null;
  frequency: string | null;
  dosing_instructions: string | null;
  notes: string | null;
  start_date: string | null;
  end_date: string | null;
};

export type InsuranceProviderApi = {
  provider_id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
};
export type InsurancePolicyApi = {
  policy_id: string;
  provider: string;
  policy_number: string;
  plan_name: string | null;
};
export type PatientInsuranceApi = {
  id?: number;
  patient: string;
  policy: string;
  member_id: string | null;
  start_date: string | null;
  end_date: string | null;
  coverage_details?: Record<string, unknown> | null;
  created_at?: string;
};

export type ChronicDiseaseCatalogApi = {
  disease_id: string;
  name: string;
  icd10_code: string | null;
};
export type PatientChronicDiseaseApi = {
  id?: number;
  patient: string;
  disease: string;
  diagnosis_date: string | null;
  severity: string | null;
  pre_existing: boolean;
  notes: string | null;
};

/** Tab7 — matches Django PatientLabPanel.components JSON */
export type PatientLabPanelComponentApi = {
  name: string;
  value: number;
  unit: string;
  range: string;
  critical: boolean;
  interpretation?: string;
};

export type PatientLabPanelApi = {
  lab_panel_id: string;
  patient: string;
  display_code: string | null;
  test_name: string;
  collected_on: string;
  status: string;
  is_new: boolean;
  components: PatientLabPanelComponentApi[];
};

export type PatientLabPanelWriteBody = {
  patient: string;
  display_code?: string | null;
  test_name: string;
  collected_on: string;
  status: string;
  is_new: boolean;
  components: PatientLabPanelComponentApi[];
};

/** Epic sandbox SMART linking (read-only; backend never stores Epic access tokens). */
export type EpicOAuthConfigApi = {
  integration_enabled: boolean;
  sandbox: boolean;
  fhir_base_url: string | null;
  authorize_url: string | null;
  redirect_uri: string | null;
  client_id: string | null;
  default_scope: string | null;
  hint: string | null;
};

export type EpicPatientLinkApi = {
  patient: string;
  status: string;
  epic_patient_fhir_id: string;
  fhir_server_base_url: string | null;
  last_error: string;
  created_at: string;
  updated_at: string;
};

/** Tab5 UI + persistence helpers (hospitalization rows stored as JSON in `notes` after a marker). */
export type Tab5ChronicHospitalization = {
  admissionDate: string;
  dischargeDate: string;
  reason: string;
  facility: string;
  physician: string;
};

export type Tab5ChronicCondition = {
  apiId: number | null;
  diseaseId: string;
  name: string;
  icdCode: string;
  diagnosisDate: string;
  severity: string;
  preExisting: boolean;
  currentTreatment: string;
  hospitalizations: Tab5ChronicHospitalization[];
};

const CHRONIC_HOSP_JSON_MARKER = '__MEDITAP_CHRONIC_HOSP_JSON__';

function parseChronicConditionNotes(raw: string | null | undefined): {
  treatment: string;
  hospitalizations: Tab5ChronicHospitalization[];
} {
  const text = raw || '';
  const idx = text.indexOf(CHRONIC_HOSP_JSON_MARKER);
  if (idx === -1) {
    const t = text.trim();
    return {
      treatment: t.replace(/^Treatment:\s*/i, '').trim() || t,
      hospitalizations: [],
    };
  }
  const before = text.slice(0, idx).trim();
  const after = text.slice(idx + CHRONIC_HOSP_JSON_MARKER.length).trim();
  let hospitalizations: Tab5ChronicHospitalization[] = [];
  try {
    const parsed = JSON.parse(after) as unknown;
    if (Array.isArray(parsed)) {
      hospitalizations = parsed
        .filter((x) => x && typeof x === 'object')
        .map((x) => {
          const o = x as Record<string, unknown>;
          return {
            admissionDate:
              typeof o.admissionDate === 'string' ? o.admissionDate : '',
            dischargeDate:
              typeof o.dischargeDate === 'string' ? o.dischargeDate : '',
            reason: typeof o.reason === 'string' ? o.reason : '',
            facility: typeof o.facility === 'string' ? o.facility : '',
            physician: typeof o.physician === 'string' ? o.physician : '',
          };
        });
    }
  } catch {
    /* ignore */
  }
  const treatment =
    before.replace(/^Treatment:\s*/i, '').trim() ||
    before.replace(/\s+/g, ' ').trim();
  return { treatment, hospitalizations };
}

function buildChronicConditionNotes(
  treatment: string,
  hospitalizations: Tab5ChronicHospitalization[]
): string | null {
  const t = treatment.trim();
  const line = t
    ? /^Treatment:/i.test(t)
      ? t
      : `Treatment: ${t}`
    : '';
  if (!hospitalizations.length) {
    return line || null;
  }
  const json = JSON.stringify(hospitalizations);
  if (!line) {
    return `${CHRONIC_HOSP_JSON_MARKER}${json}`;
  }
  return `${line}\n${CHRONIC_HOSP_JSON_MARKER}\n${json}`;
}

export async function fetchTab5ChronicConditions(
  username: string | null
): Promise<Tab5ChronicCondition[]> {
  const patients = await fetchAllPages<PatientApi>('/api/patients/');
  const current = pickCurrentPatient(patients, username);
  if (!current) return [];

  const [rows, catalogs] = await Promise.all([
    fetchAllPages<PatientChronicDiseaseApi & { id: number }>(
      '/api/patient-chronic-diseases/'
    ),
    fetchAllPages<ChronicDiseaseCatalogApi>('/api/chronic-disease-catalog/'),
  ]);
  const catalogById = new Map(catalogs.map((c) => [c.disease_id, c]));

  return rows
    .filter((r) => r.patient === current.patient_id)
    .map((r) => {
      const cat = r.disease ? catalogById.get(r.disease) : undefined;
      const { treatment, hospitalizations } = parseChronicConditionNotes(
        r.notes
      );
      return {
        apiId: r.id,
        diseaseId: r.disease,
        name: cat?.name || '—',
        icdCode: (cat?.icd10_code || '').trim(),
        diagnosisDate: (r.diagnosis_date || '').trim(),
        severity: (r.severity || '').trim(),
        preExisting: Boolean(r.pre_existing),
        currentTreatment: treatment,
        hospitalizations,
      };
    })
    .sort((a, b) =>
      (b.diagnosisDate || '').localeCompare(a.diagnosisDate || '')
    );
}

export async function saveTab5ChronicCondition(
  username: string | null,
  condition: Tab5ChronicCondition,
  isNew: boolean
): Promise<void> {
  const patients = await fetchAllPages<PatientApi>('/api/patients/');
  const patient = pickCurrentPatient(patients, username);
  if (!patient) {
    throw new Error(
      'No patient record found. Add patient information (Tab 14) first.'
    );
  }

  const diseaseId = await ensureDiseaseCatalog(condition.name, condition.icdCode);
  const notes = buildChronicConditionNotes(
    condition.currentTreatment,
    condition.hospitalizations
  );

  const body = {
    patient: patient.patient_id,
    disease: diseaseId,
    diagnosis_date: condition.diagnosisDate.trim() || null,
    severity: condition.severity.trim() || null,
    pre_existing: condition.preExisting,
    notes,
    is_active: true,
    medication: null as string | null,
  };

  if (isNew || condition.apiId == null) {
    await requestJson<PatientChronicDiseaseApi>('/api/patient-chronic-diseases/', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  } else {
    await requestJson<PatientChronicDiseaseApi>(
      `/api/patient-chronic-diseases/${condition.apiId}/`,
      {
        method: 'PATCH',
        body: JSON.stringify(body),
      }
    );
  }
}

export async function deleteTab5ChronicDisease(apiId: number): Promise<void> {
  await apiRequest(`/api/patient-chronic-diseases/${apiId}/`, {
    method: 'DELETE',
  });
}

export type HospitalApi = { hospital_id: string; name: string };
export type IncidentApi = {
  incident_id: string;
  patient: string;
  hospital: string;
  occurred_at: string;
  incident_type: string;
  summary: string;
  clinical_notes: string | null;
  diagnosis_code: string | null;
  procedure_code?: string | null;
  severity?: string | null;
  location?: string | null;
  outcome?: string | null;
  record_code?: string | null;
};

export type Tab6IncidentPayload = {
  patient: string;
  hospital: string;
  occurred_at: string;
  incident_type: string;
  summary: string;
  severity?: string;
  location?: string;
  outcome?: string;
  record_code?: string;
};

export function mapIncidentApiToTab6Record(row: IncidentApi): IncidentRecord {
  const date =
    typeof row.occurred_at === 'string' && row.occurred_at.length >= 10
      ? row.occurred_at.slice(0, 10)
      : row.occurred_at || '—';
  const displayId =
    (row.record_code && row.record_code.trim()) ||
    row.incident_id.replace(/-/g, '').slice(0, 8).toUpperCase();
  return {
    id: displayId,
    serverId: row.incident_id,
    hospitalId: row.hospital,
    type: row.incident_type || '—',
    date,
    severity: (row.severity && row.severity.trim()) || '—',
    location: (row.location && row.location.trim()) || '—',
    outcome: (row.outcome && row.outcome.trim()) || '—',
    details: row.summary || '—',
  };
}

export async function fetchTab6Data(username: string | null): Promise<{
  patientId: string | null;
  hospitals: HospitalApi[];
  incidents: IncidentApi[];
}> {
  const [patients, hospitals] = await Promise.all([
    fetchAllPages<PatientApi>('/api/patients/'),
    fetchAllPages<HospitalApi>('/api/hospitals/'),
  ]);
  const current = pickCurrentPatient(patients, username);
  if (!current) {
    return { patientId: null, hospitals, incidents: [] };
  }
  const q = encodeURIComponent(current.patient_id);
  const incidents = await fetchAllPages<IncidentApi>(
    `/api/incidents/?patient=${q}`
  );
  return { patientId: current.patient_id, hospitals, incidents };
}

export async function createTab6Incident(
  body: Tab6IncidentPayload
): Promise<IncidentApi> {
  return requestJson<IncidentApi>('/api/incidents/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function updateTab6Incident(
  incidentId: string,
  body: Partial<Tab6IncidentPayload>
): Promise<IncidentApi> {
  return requestJson<IncidentApi>(`/api/incidents/${incidentId}/`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export type DashboardSummary = {
  name: string;
  id: string;
  email: string;
  healthSummary: {
    bmi: string;
    lmd: string;
    lastVisit: string;
    allergies: number;
    medications: number;
  };
};

export type DashboardDetail = DashboardSummary & {
  patientProfile: {
    fullName: string;
    patientId: string;
    dateOfBirth: string;
    bloodType: string;
    sexAtBirth: string;
    email: string;
    phone: string;
  };
  allergies: {
    name: string;
    typeLabel: string;
    reaction: string;
    severity: string;
    lastObserved: string;
  }[];
  medications: {
    genericName: string;
    brandName: string;
    dosage: string;
    frequency: string;
    purpose: string;
    prescriber: string;
    startDate: string;
  }[];
  chronicConditions: {
    conditionName: string;
    icdCode: string;
    diagnosisDate: string;
    severity: string;
    preexisting: string;
    notes: string;
  }[];
  insurance: {
    provider: string;
    planName: string;
    policyId: string;
    groupNumber: string;
    memberId: string;
    status: string;
    validUntil: string;
  }[];
  hospital: {
    type: string;
    facility: string;
    reason: string;
    date: string;
    discharge: string;
    attending: string;
    reportId: string;
  } | null;
};

function normalizeApiPath(path: string): string {
  return path.startsWith('/') ? path : `/${path}`;
}

/** Avoid rendering full Django DEBUG HTML pages in toast / inline error text. */
function summarizeApiErrorBody(status: number, body: string, statusText: string) {
  const t = (body || '').trim();
  if (!t) return statusText || 'Request failed';
  const looksLikeHtml =
    /^<!DOCTYPE/i.test(t) ||
    /<html[\s>]/i.test(t) ||
    (t.length > 300 && /<table|<pre class="exception_value"/i.test(t));
  if (looksLikeHtml) {
    return `server error (${status}); check API logs or run database migrations`;
  }
  // Keep JSON intact so callers (e.g. staff elevation modal) can parse detail/hint/keycloak_error.
  if (t.startsWith('{') && t.endsWith('}')) {
    return t.length > 4000 ? `${t.slice(0, 4000)}…` : t;
  }
  return t.length > 280 ? `${t.slice(0, 280)}…` : t;
}

/** Shorter copy for inline errors so raw JSON is not mistaken for ads or spam. */
export function formatSessionOrTokenErrorForUi(message: string): string {
  const m = message.toLowerCase();
  if (
    m.includes('token_not_valid') ||
    m.includes('given token not valid') ||
    m.includes('token is invalid') ||
    m.includes('invalid or expired token')
  ) {
    return (
      'The MediTap server did not accept your sign-in token (it may be expired, or the ' +
      'backend may not trust your Keycloak URL). Try Log out, then sign in again. ' +
      'Developers: add your token iss to KEYCLOAK_ALLOWED_ISSUERS on the Django backend.'
    );
  }
  return message;
}

async function apiRequest<T>(
  path: string,
  init?: RequestInit
): Promise<T | undefined> {
  if (!API_BASE) {
    throw new Error('API base URL is not configured.');
  }
  const headers = await getAuthHeaders();
  const elevation = getMeditapElevationRequestHeaders();
  const response = await fetch(`${API_BASE}${normalizeApiPath(path)}`, {
    ...init,
    headers: {
      ...headers,
      ...elevation,
      ...(init?.headers || {}),
    },
  });
  if (!response.ok) {
    // Staff elevation uses 401 for wrong staff password; that must not wipe the patient's Keycloak session.
    const staffElevatePath =
      normalizeApiPath(path).includes('/api/auth/staff-elevate');
    if (response.status === 401 && !staffElevatePath) {
      emitSessionExpired();
    }
    const errorText = await response.text().catch(() => '');
    const detail = summarizeApiErrorBody(
      response.status,
      errorText,
      response.statusText
    );
    throw new Error(`API ${response.status}: ${detail}`);
  }
  if (response.status === 204) return undefined;
  return (await response.json()) as T;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const data = await apiRequest<T>(path, init);
  return data as T;
}

async function fetchAllPages<T>(basePath: string): Promise<T[]> {
  const out: T[] = [];
  let page = 1;
  for (;;) {
    const sep = basePath.includes('?') ? '&' : '?';
    const data = await requestJson<Paginated<T>>(
      `${basePath}${sep}page=${page}`
    );
    out.push(...data.results);
    if (!data.next) break;
    page += 1;
    if (page > 200) break;
  }
  return out;
}

function safeFirstNameFromUsername(username: string | null): string {
  if (!username) return 'Patient';
  return username.split(/[.@_ -]/)[0] || 'Patient';
}

function formatDate(isoLike?: string | null): string {
  if (!isoLike) return 'N/A';
  const date = new Date(isoLike);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toISOString().slice(0, 10);
}

function pickCurrentPatient(
  patients: PatientApi[],
  username: string | null
): PatientApi | null {
  if (!patients.length) return null;
  if (username) {
    const normalized = username.toLowerCase();
    const byEmail = patients.find(
      (p) => (p.email || '').toLowerCase() === normalized
    );
    if (byEmail) return byEmail;
    const byUsername = patients.find(
      (p) => (p.email || '').split('@')[0]?.toLowerCase() === normalized
    );
    if (byUsername) return byUsername;
  }
  return patients[0];
}

function parseNameFromKeycloakClaims(
  parsed: Record<string, unknown> | undefined
): { given: string; family: string } {
  const gn =
    typeof parsed?.given_name === 'string' ? parsed.given_name.trim() : '';
  const fn =
    typeof parsed?.family_name === 'string' ? parsed.family_name.trim() : '';
  if (gn || fn) {
    return {
      given: gn || 'Patient',
      family: fn || 'User',
    };
  }
  const name = typeof parsed?.name === 'string' ? parsed.name.trim() : '';
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return { given: parts[0], family: parts.slice(1).join(' ') };
    }
    return { given: parts[0] || 'Patient', family: 'User' };
  }
  return { given: 'Patient', family: 'User' };
}

/**
 * When the API has no Patient rows yet, create one from the Keycloak access token
 * so tabs like Lab Results can attach data (same idea as completing Tab14, but minimal).
 */
export async function ensurePatientForCurrentSession(
  username: string | null,
  preloadedPatients?: PatientApi[]
): Promise<PatientApi | null> {
  if (!API_BASE) return null;
  const patients =
    preloadedPatients ?? (await fetchAllPages<PatientApi>('/api/patients/'));
  const existing = pickCurrentPatient(patients, username);
  if (existing) return existing;
  if (patients.length > 0) {
    return null;
  }

  const kc = getKeycloak();
  if (!kc.authenticated || !kc.tokenParsed) return null;

  const parsed = kc.tokenParsed as Record<string, unknown>;
  const emailFromToken =
    typeof parsed.email === 'string' ? parsed.email.trim() : '';
  const preferred =
    (typeof parsed.preferred_username === 'string' &&
      parsed.preferred_username.trim()) ||
    username?.trim() ||
    'patient';
  const sub = typeof parsed.sub === 'string' ? parsed.sub : '';

  let emailForPatient = emailFromToken;
  if (!emailForPatient) {
    if (preferred.includes('@')) {
      emailForPatient = preferred;
    } else if (sub) {
      const safe = sub.replace(/[^a-zA-Z0-9]/g, '').slice(0, 48) || 'user';
      emailForPatient = `${safe}@keycloak.local`;
    } else {
      emailForPatient = `${preferred.replace(/[^a-zA-Z0-9._-]/g, '_')}@keycloak.local`;
    }
  }

  const { given, family } = parseNameFromKeycloakClaims(parsed);

  try {
    return await requestJson<PatientApi>('/api/patients/', {
      method: 'POST',
      body: JSON.stringify({
        given_name: given,
        family_name: family,
        date_of_birth: '1970-01-01',
        blood_type: null,
        sex_at_birth: null,
        email: emailForPatient,
        phone: null,
      }),
    });
  } catch {
    return null;
  }
}

export async function fetchDashboardSummary(
  username: string | null
): Promise<DashboardSummary> {
  const patientsPage = await requestJson<Paginated<PatientApi>>(
    '/api/patients/'
  );
  const currentPatient = pickCurrentPatient(patientsPage.results, username);

  if (!currentPatient) {
    return {
      name: safeFirstNameFromUsername(username),
      id: 'Not created yet',
      email: username || 'Not available',
      healthSummary: {
        bmi: 'N/A',
        lmd: 'No patient record yet',
        lastVisit: 'N/A',
        allergies: 0,
        medications: 0,
      },
    };
  }

  const [allergiesPage, medicationsPage, incidentsPage] = await Promise.all([
    requestJson<Paginated<PatientAllergyApi>>('/api/patient-allergies/'),
    requestJson<Paginated<PatientMedicationApi>>('/api/patient-medications/'),
    requestJson<Paginated<IncidentApi>>('/api/incidents/'),
  ]);

  const patientId = currentPatient.patient_id;
  const allergyCount = allergiesPage.results.filter(
    (a) => a.patient === patientId
  ).length;
  const medicationCount = medicationsPage.results.filter(
    (m) => m.patient === patientId
  ).length;
  const mostRecentIncident = incidentsPage.results
    .filter((i) => i.patient === patientId)
    .sort((a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at))[0];

  return {
    name: `${currentPatient.given_name} ${currentPatient.family_name}`.trim(),
    id: currentPatient.patient_id.slice(0, 8).toUpperCase(),
    email: currentPatient.email || username || 'Not available',
    healthSummary: {
      bmi: 'N/A',
      lmd: 'MediTap record',
      lastVisit: formatDate(mostRecentIncident?.occurred_at),
      allergies: allergyCount,
      medications: medicationCount,
    },
  };
}

function parseAllergyNotes(notes: string | null | undefined): {
  typeLabel: string;
  reaction: string;
  lastObserved: string;
} {
  const text = notes || '';
  const typeM = text.match(/Type:\s*([^/\n]+)/i);
  const reactM = text.match(/Reaction:\s*([^/\n]+)/i);
  const lastM = text.match(/LastObserved:\s*([0-9-]+)/i);
  return {
    typeLabel: typeM?.[1]?.trim() || '—',
    reaction: reactM?.[1]?.trim() || text || '—',
    lastObserved: lastM?.[1]?.trim() || '—',
  };
}

function parseMedicationNotes(
  dosing: string | null | undefined,
  notes: string | null | undefined
): { purpose: string; prescriber: string } {
  const d = dosing || '';
  const n = notes || '';
  const purposeM = d.match(/Purpose:\s*([^\n]+)/i) || n.match(/Purpose:\s*([^\n]+)/i);
  const prescM = n.match(/Prescriber:\s*([^\n]+)/i);
  return {
    purpose: purposeM?.[1]?.trim() || '—',
    prescriber: prescM?.[1]?.trim() || '—',
  };
}

function parsePlanGroup(planName: string | null | undefined): {
  plan: string;
  group: string;
} {
  const p = planName || '';
  const gm = p.match(/\(Group:\s*([^)]+)\)/i);
  if (gm) {
    return {
      plan: p.replace(/\s*\(Group:\s*[^)]+\)\s*/i, '').trim() || '—',
      group: gm[1].trim(),
    };
  }
  return { plan: p || '—', group: '—' };
}

/** Tab12 insurance card + edit modal (mirrors backend `coverage_details` JSON). */
export type Tab12InsurancePolicyUi = {
  memberId: string;
  policyId: string;
  planType: string;
  providerName: string;
  providerPhone: string;
  providerEmail: string;
  policyHolderName: string;
  coverageType: string;
  groupNumber: string;
  startDate: string;
  endDate: string;
  copayVPCP: string;
  copaySC: string;
  copayEUC: string;
  prescriptionDPI: string;
  healthPWA: string;
  inNetworkDAC: string;
  outofNetworkDAC: string;
  planContactInfo: string;
  deductible: string;
  maxOutOfPocket: string;
  status: string;
};

export type Tab12InsuranceRowMeta = {
  patientInsuranceId: number;
  policyUuid: string;
  providerUuid: string;
};

export type Tab12InsuranceView = {
  patientName: string;
  dateOfBirth: string;
  rows: { meta: Tab12InsuranceRowMeta; policy: Tab12InsurancePolicyUi }[];
};

function coverageStr(obj: unknown, key: string): string {
  if (!obj || typeof obj !== 'object') return '';
  const v = (obj as Record<string, unknown>)[key];
  return v == null ? '' : String(v).trim();
}

function tab12DateToApi(s: string): string | null {
  const t = (s || '').trim();
  if (!t || t === '—') return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(t) ? t : null;
}

function tab12TextOrNull(s: string): string | null {
  const t = (s || '').trim();
  if (!t || t === '—') return null;
  return t;
}

function tab12PlanNameForApi(planType: string, groupNumber: string): string | null {
  const plan = tab12TextOrNull(planType) || '';
  const g = tab12TextOrNull(groupNumber) || '';
  if (g) {
    return plan ? `${plan} (Group: ${g})` : `(Group: ${g})`;
  }
  return plan || null;
}

function coverageDetailsFromTab12Policy(
  p: Tab12InsurancePolicyUi
): Record<string, string> {
  return {
    policy_holder_name: (p.policyHolderName || '').trim(),
    coverage_type: (p.coverageType || '').trim(),
    copay_primary_care: (p.copayVPCP || '').trim(),
    copay_specialty: (p.copaySC || '').trim(),
    copay_emergency_urgent: (p.copayEUC || '').trim(),
    prescription_plan: (p.prescriptionDPI || '').trim(),
    in_network_dac: (p.inNetworkDAC || '').trim(),
    out_of_network_dac: (p.outofNetworkDAC || '').trim(),
    plan_contact: (p.planContactInfo || '').trim(),
    deductible: (p.deductible || '').trim(),
    max_oop: (p.maxOutOfPocket || '').trim(),
    status: (p.status || '').trim(),
  };
}

function patientInsuranceRowToTab12Policy(
  row: PatientInsuranceApi & { id: number },
  pol: InsurancePolicyApi,
  prov: InsuranceProviderApi,
  patientFullName: string
): Tab12InsurancePolicyUi {
  const pg = parsePlanGroup(pol.plan_name);
  const cd = row.coverage_details;
  const endRaw = row.end_date || '';
  const computedStatus =
    endRaw && new Date(endRaw) < new Date() ? 'Inactive' : 'Active';
  const sd = formatDate(row.start_date);
  const ed = endRaw ? formatDate(endRaw) : '';
  return {
    memberId: row.member_id?.trim() || '—',
    policyId: pol.policy_number || '—',
    planType: pg.plan !== '—' ? pg.plan : coverageStr(cd, 'plan_type') || '—',
    providerName: prov.name || '—',
    providerPhone: (prov.phone || '').trim() || '—',
    providerEmail: (prov.email || '').trim() || '—',
    policyHolderName:
      coverageStr(cd, 'policy_holder_name') || patientFullName || '—',
    coverageType: coverageStr(cd, 'coverage_type') || '—',
    groupNumber: pg.group !== '—' ? pg.group : coverageStr(cd, 'group_number') || '—',
    startDate: sd === 'N/A' ? '' : sd,
    endDate: ed === 'N/A' ? '' : ed,
    copayVPCP: coverageStr(cd, 'copay_primary_care') || '—',
    copaySC: coverageStr(cd, 'copay_specialty') || '—',
    copayEUC: coverageStr(cd, 'copay_emergency_urgent') || '—',
    prescriptionDPI: coverageStr(cd, 'prescription_plan') || '—',
    healthPWA:
      (prov.website || '').trim() || coverageStr(cd, 'health_plan_website') || '—',
    inNetworkDAC: coverageStr(cd, 'in_network_dac') || '—',
    outofNetworkDAC: coverageStr(cd, 'out_of_network_dac') || '—',
    planContactInfo: coverageStr(cd, 'plan_contact') || '—',
    deductible: coverageStr(cd, 'deductible') || '—',
    maxOutOfPocket: coverageStr(cd, 'max_oop') || '—',
    status: coverageStr(cd, 'status') || computedStatus,
  };
}

export async function fetchPatientInsuranceTabData(
  username: string | null
): Promise<Tab12InsuranceView> {
  const patients = await fetchAllPages<PatientApi>('/api/patients/');
  const current = pickCurrentPatient(patients, username);
  if (!current) {
    return { patientName: '—', dateOfBirth: '—', rows: [] };
  }
  const pid = current.patient_id;
  const fullName =
    `${current.given_name} ${current.family_name}`.trim() || '—';
  const dob = formatDate(current.date_of_birth);
  const [piRows, policies, providers] = await Promise.all([
    fetchAllPages<PatientInsuranceApi & { id: number }>(
      '/api/patient-insurances/'
    ),
    fetchAllPages<InsurancePolicyApi>('/api/insurance-policies/'),
    fetchAllPages<InsuranceProviderApi>('/api/insurance-providers/'),
  ]);
  const policyById = new Map(policies.map((p) => [p.policy_id, p]));
  const providerById = new Map(providers.map((pr) => [pr.provider_id, pr]));
  let mine = piRows.filter((r) => r.patient === pid && r.id != null);
  mine = [...mine].sort((a, b) => {
    const ta = a.created_at ? +new Date(a.created_at) : 0;
    const tb = b.created_at ? +new Date(b.created_at) : 0;
    return ta - tb;
  });
  const rows: Tab12InsuranceView['rows'] = [];
  for (const row of mine) {
    const pol = policyById.get(row.policy);
    if (!pol) continue;
    const prov = providerById.get(pol.provider);
    if (!prov) continue;
    rows.push({
      meta: {
        patientInsuranceId: row.id as number,
        policyUuid: pol.policy_id,
        providerUuid: prov.provider_id,
      },
      policy: patientInsuranceRowToTab12Policy(row, pol, prov, fullName),
    });
  }
  return { patientName: fullName, dateOfBirth: dob, rows };
}

export async function updateTab12InsuranceRow(input: {
  meta: Tab12InsuranceRowMeta;
  policy: Tab12InsurancePolicyUi;
}): Promise<void> {
  const { meta, policy } = input;
  const cd = coverageDetailsFromTab12Policy(policy);
  const planName = tab12PlanNameForApi(policy.planType, policy.groupNumber);
  await requestJson<PatientInsuranceApi>(
    `/api/patient-insurances/${meta.patientInsuranceId}/`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        member_id:
          policy.memberId.trim() && policy.memberId !== '—'
            ? policy.memberId.trim()
            : null,
        start_date: tab12DateToApi(policy.startDate),
        end_date: tab12DateToApi(policy.endDate),
        coverage_details: cd,
      }),
    }
  );
  await requestJson<InsuranceProviderApi>(
    `/api/insurance-providers/${meta.providerUuid}/`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        phone:
          policy.providerPhone.trim() && policy.providerPhone !== '—'
            ? policy.providerPhone.trim()
            : null,
        email:
          policy.providerEmail.trim() && policy.providerEmail !== '—'
            ? policy.providerEmail.trim()
            : null,
        website:
          policy.healthPWA.trim() && policy.healthPWA !== '—'
            ? policy.healthPWA.trim()
            : null,
      }),
    }
  );
  await requestJson<InsurancePolicyApi>(
    `/api/insurance-policies/${meta.policyUuid}/`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        plan_name: planName,
      }),
    }
  );
}

export async function fetchDashboardDetail(
  username: string | null
): Promise<DashboardDetail> {
  const summary = await fetchDashboardSummary(username);
  const patients = await fetchAllPages<PatientApi>('/api/patients/');
  const current = pickCurrentPatient(patients, username);
  if (!current) {
    return {
      ...summary,
      patientProfile: {
        fullName: summary.name,
        patientId: summary.id,
        dateOfBirth: '—',
        bloodType: '—',
        sexAtBirth: '—',
        email: summary.email || '—',
        phone: '—',
      },
      allergies: [],
      medications: [],
      chronicConditions: [],
      insurance: [],
      hospital: null,
    };
  }

  const pid = current.patient_id;
  const [
    allergyLinks,
    medLinks,
    insLinks,
    incidents,
    catalogsAllergies,
    catalogsMeds,
    catalogsDiseases,
    policies,
    providers,
    hospitals,
  ] = await Promise.all([
    fetchAllPages<PatientAllergyApi>('/api/patient-allergies/'),
    fetchAllPages<PatientMedicationApi>('/api/patient-medications/'),
    fetchAllPages<PatientInsuranceApi>('/api/patient-insurances/'),
    fetchAllPages<IncidentApi>('/api/incidents/'),
    fetchAllPages<AllergyCatalogApi>('/api/allergy-catalog/'),
    fetchAllPages<MedicationCatalogApi>('/api/medication-catalog/'),
    fetchAllPages<ChronicDiseaseCatalogApi>('/api/chronic-disease-catalog/'),
    fetchAllPages<InsurancePolicyApi>('/api/insurance-policies/'),
    fetchAllPages<InsuranceProviderApi>('/api/insurance-providers/'),
    fetchAllPages<HospitalApi>('/api/hospitals/'),
  ]);

  const allergyById = new Map(catalogsAllergies.map((a) => [a.allergy_id, a]));
  const medById = new Map(catalogsMeds.map((m) => [m.medication_id, m]));
  const policyById = new Map(policies.map((p) => [p.policy_id, p]));
  const providerById = new Map(providers.map((p) => [p.provider_id, p]));
  const hospitalById = new Map(hospitals.map((h) => [h.hospital_id, h]));

  const allergies = allergyLinks
    .filter((a) => a.patient === pid)
    .map((row) => {
      const cat = allergyById.get(row.allergy);
      const parsed = parseAllergyNotes(row.reaction_notes);
      return {
        name: cat?.name || '—',
        typeLabel: parsed.typeLabel,
        reaction: parsed.reaction,
        severity: row.severity || '—',
        lastObserved: parsed.lastObserved,
      };
    });

  const medications = medLinks
    .filter((m) => m.patient === pid)
    .map((row) => {
      const cat = medById.get(row.medication);
      const extra = parseMedicationNotes(row.dosing_instructions, row.notes);
      return {
        genericName: cat?.generic_name || '—',
        brandName: cat?.brand_name || '—',
        dosage: row.dosage || '—',
        frequency: row.frequency || '—',
        purpose: extra.purpose,
        prescriber: extra.prescriber,
        startDate: formatDate(row.start_date),
      };
    });

  const insurance = insLinks
    .filter((i) => i.patient === pid)
    .map((row) => {
      const pol = policyById.get(row.policy);
      const prov = pol ? providerById.get(pol.provider) : undefined;
      const pg = parsePlanGroup(pol?.plan_name);
      const validUntil =
        typeof row.end_date === 'string' && row.end_date
          ? formatDate(row.end_date)
          : '—';
      const status =
        row.end_date && new Date(row.end_date) < new Date()
          ? 'Inactive'
          : 'Active';
      return {
        provider: prov?.name || '—',
        planName: pg.plan,
        policyId: pol?.policy_number || '—',
        groupNumber: pg.group,
        memberId: row.member_id || '—',
        status,
        validUntil,
      };
    });

  const chronicById = new Map(catalogsDiseases.map((d) => [d.disease_id, d]));
  const chronicLinks = await fetchAllPages<PatientChronicDiseaseApi>(
    '/api/patient-chronic-diseases/'
  );
  const chronicConditions = chronicLinks
    .filter((c) => c.patient === pid)
    .map((row) => {
      const disease = chronicById.get(row.disease);
      return {
        conditionName: disease?.name || '—',
        icdCode: disease?.icd10_code || '—',
        diagnosisDate: formatDate(row.diagnosis_date),
        severity: row.severity || '—',
        preexisting: row.pre_existing ? 'Yes' : 'No',
        notes: row.notes || '—',
      };
    });

  const latest = incidents
    .filter((i) => i.patient === pid)
    .sort((a, b) => +new Date(b.occurred_at) - +new Date(a.occurred_at))[0];

  let hospital: DashboardDetail['hospital'] = null;
  if (latest) {
    const h = hospitalById.get(latest.hospital);
    const notes = latest.clinical_notes || '';
    const discM = notes.match(/Discharge:\s*([0-9-]+)/i);
    const attM = notes.match(/Attending:\s*([^\n]+)/i);
    hospital = {
      type: latest.incident_type || '—',
      facility: h?.name || '—',
      reason: latest.summary || '—',
      date: formatDate(latest.occurred_at),
      discharge: discM?.[1]?.trim() || '—',
      attending: attM?.[1]?.trim() || '—',
      reportId: latest.diagnosis_code || '—',
    };
  }

  return {
    ...summary,
    patientProfile: {
      fullName: `${current.given_name} ${current.family_name}`.trim() || summary.name,
      patientId: current.patient_id.slice(0, 8).toUpperCase(),
      dateOfBirth: formatDate(current.date_of_birth),
      bloodType: current.blood_type || '—',
      sexAtBirth: current.sex_at_birth || '—',
      email: current.email || summary.email || '—',
      phone: current.phone || '—',
    },
    allergies,
    medications,
    chronicConditions,
    insurance,
    hospital,
  };
}

/* ——— Tab14 save payloads (mirror form state) ——— */

export type Tab14SavePatient = {
  givenName: string;
  familyName: string;
  dateOfBirth: string;
  bloodType: string;
  email: string;
  phoneNumber: string;
  sexAtBirth: string;
};

export type Tab14SaveInsurance = {
  providerName: string;
  policyNumber: string;
  planName: string;
  memberID: string;
  groupNumber: string;
  startDate: string;
  endDate: string;
};

export type Tab14SaveAllergy = {
  allergyName: string;
  allergyType: string;
  /** Free text when `allergyType` is `Other`; appended as `Other (…)` when saving. */
  allergyTypeOther?: string;
  severity: string;
  reactionNotes: string;
  lastObserved: string;
};

export type Tab14SaveMedication = {
  genericName: string;
  brandName: string;
  dosage: string;
  route: string;
  frequency: string;
  startDate: string;
  endDate: string;
  purpose: string;
  prescribingPhysician: string;
  notesMedication: string;
};

export type Tab14SaveChronic = {
  conditionName: string;
  icdCode: string;
  diagnosisDate: string;
  severity: string;
  prexisting: string;
  notesChronicConditions: string;
};

export type Tab14SaveHospital = {
  facilityName: string;
  visitType: string;
  reason: string;
  visitDate: string;
  dischargeDate: string;
  attendingPhysician: string;
  reportId: string;
};

export type Tab14SaveInput = {
  username: string | null;
  patient: Tab14SavePatient;
  insurances: Tab14SaveInsurance[];
  allergies: Tab14SaveAllergy[];
  medications: Tab14SaveMedication[];
  chronicConditions: Tab14SaveChronic[];
  hospitalVisit: Tab14SaveHospital;
  noAllergies: boolean;
};

async function ensureAllergyCatalog(name: string): Promise<string> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('Allergy name is required.');
  const all = await fetchAllPages<AllergyCatalogApi>('/api/allergy-catalog/');
  const found = all.find((a) => a.name.toLowerCase() === trimmed.toLowerCase());
  if (found) return found.allergy_id;
  const created = await requestJson<AllergyCatalogApi>('/api/allergy-catalog/', {
    method: 'POST',
    body: JSON.stringify({ name: trimmed, description: '' }),
  });
  return created.allergy_id;
}

async function ensureMedicationCatalog(
  genericName: string,
  brandName: string
): Promise<string> {
  const g = genericName.trim();
  if (!g) throw new Error('Medication generic name is required.');
  const b = brandName.trim() || '';
  const all = await fetchAllPages<MedicationCatalogApi>(
    '/api/medication-catalog/'
  );
  const found = all.find(
    (m) =>
      m.generic_name.toLowerCase() === g.toLowerCase() &&
      (m.brand_name || '').toLowerCase() === b.toLowerCase()
  );
  if (found) return found.medication_id;
  const created = await requestJson<MedicationCatalogApi>(
    '/api/medication-catalog/',
    {
      method: 'POST',
      body: JSON.stringify({
        generic_name: g,
        brand_name: b || null,
        atc_code: '',
      }),
    }
  );
  return created.medication_id;
}

async function ensureDiseaseCatalog(
  name: string,
  icd: string
): Promise<string> {
  const n = name.trim();
  if (!n) throw new Error('Condition name is required.');
  const all = await fetchAllPages<ChronicDiseaseCatalogApi>(
    '/api/chronic-disease-catalog/'
  );
  const found = all.find((d) => d.name.toLowerCase() === n.toLowerCase());
  if (found) return found.disease_id;
  const created = await requestJson<ChronicDiseaseCatalogApi>(
    '/api/chronic-disease-catalog/',
    {
      method: 'POST',
      body: JSON.stringify({
        name: n,
        description: '',
        icd10_code: icd.trim() || '',
      }),
    }
  );
  return created.disease_id;
}

export async function ensureHospital(name: string): Promise<string> {
  const n = name.trim();
  if (!n) throw new Error('Hospital / facility name is required.');
  const all = await fetchAllPages<HospitalApi>('/api/hospitals/');
  const found = all.find((h) => h.name.toLowerCase() === n.toLowerCase());
  if (found) return found.hospital_id;
  const created = await requestJson<HospitalApi>('/api/hospitals/', {
    method: 'POST',
    body: JSON.stringify({ name: n }),
  });
  return created.hospital_id;
}

async function ensureInsuranceProvider(name: string): Promise<string> {
  const n = name.trim();
  if (!n) throw new Error('Insurance provider name is required.');
  const all = await fetchAllPages<InsuranceProviderApi>(
    '/api/insurance-providers/'
  );
  const found = all.find((p) => p.name.toLowerCase() === n.toLowerCase());
  if (found) return found.provider_id;
  const created = await requestJson<InsuranceProviderApi>(
    '/api/insurance-providers/',
    {
      method: 'POST',
      body: JSON.stringify({ name: n }),
    }
  );
  return created.provider_id;
}

async function deleteById(base: string, id: number): Promise<void> {
  await apiRequest(`${base}${id}/`, { method: 'DELETE' });
}

export type StaffElevateResponse = {
  elevation_token: string;
  expires_in: number;
};

/** Backend verifies staff with Keycloak (password grant); patient browser session unchanged. */
export async function requestPatientIntakeStaffElevation(
  username: string,
  password: string
): Promise<StaffElevateResponse> {
  return requestJson<StaffElevateResponse>('/api/auth/staff-elevate/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  });
}

export async function fetchPatientLabPanels(
  username: string | null
): Promise<{ patientId: string | null; panels: PatientLabPanelApi[] }> {
  const patients = await fetchAllPages<PatientApi>('/api/patients/');
  let current = pickCurrentPatient(patients, username);
  if (!current) {
    current = await ensurePatientForCurrentSession(username, patients);
  }
  if (!current) {
    return { patientId: null, panels: [] };
  }
  const q = encodeURIComponent(current.patient_id);
  const panels = await fetchAllPages<PatientLabPanelApi>(
    `/api/patient-lab-panels/?patient=${q}`
  );
  return { patientId: current.patient_id, panels };
}

export async function createPatientLabPanel(
  body: PatientLabPanelWriteBody
): Promise<PatientLabPanelApi> {
  return requestJson<PatientLabPanelApi>('/api/patient-lab-panels/', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function updatePatientLabPanel(
  labPanelId: string,
  body: Partial<PatientLabPanelWriteBody>
): Promise<PatientLabPanelApi> {
  return requestJson<PatientLabPanelApi>(
    `/api/patient-lab-panels/${labPanelId}/`,
    {
      method: 'PATCH',
      body: JSON.stringify(body),
    }
  );
}

export async function deletePatientLabPanel(labPanelId: string): Promise<void> {
  await apiRequest(`/api/patient-lab-panels/${labPanelId}/`, {
    method: 'DELETE',
  });
}

export async function fetchEpicOAuthConfig(): Promise<EpicOAuthConfigApi> {
  return requestJson<EpicOAuthConfigApi>('/api/epic/oauth-config/');
}

export async function fetchPatientEpicLinkForSession(
  username: string | null
): Promise<{ patientId: string | null; link: EpicPatientLinkApi | null }> {
  const patients = await fetchAllPages<PatientApi>('/api/patients/');
  let current = pickCurrentPatient(patients, username);
  if (!current) {
    current = await ensurePatientForCurrentSession(username, patients);
  }
  if (!current) {
    return { patientId: null, link: null };
  }
  const link = await requestJson<EpicPatientLinkApi>(
    `/api/patients/${current.patient_id}/epic-link/`
  );
  return { patientId: current.patient_id, link };
}

export async function prepareEpicPatientAuthorize(
  patientId: string
): Promise<{ authorize_url: string; state: string }> {
  return requestJson<{ authorize_url: string; state: string }>(
    `/api/patients/${patientId}/epic-link/prepare-authorize/`,
    { method: 'POST', body: '{}' }
  );
}

export async function completeEpicOAuth(
  code: string,
  state: string
): Promise<EpicPatientLinkApi> {
  return requestJson<EpicPatientLinkApi>('/api/epic/oauth-complete/', {
    method: 'POST',
    body: JSON.stringify({ code, state }),
  });
}

export async function patchPatientEpicLink(
  patientId: string,
  body: Partial<
    Pick<EpicPatientLinkApi, 'status' | 'epic_patient_fhir_id' | 'fhir_server_base_url'>
  >
): Promise<EpicPatientLinkApi> {
  return requestJson<EpicPatientLinkApi>(`/api/patients/${patientId}/epic-link/`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export async function saveTab14ToBackend(input: Tab14SaveInput): Promise<void> {
  const emailForMatch = (input.patient.email || '').trim()
    ? (input.patient.email || '').trim()
    : (input.username || '').includes('@')
      ? (input.username || '').trim()
      : `${(input.username || '').trim()}@local`;

  const patients = await fetchAllPages<PatientApi>('/api/patients/');
  let patient = pickCurrentPatient(patients, input.username);
  if (
    !patient &&
    (input.patient.email || '').trim()
  ) {
    patient =
      patients.find(
        (p) =>
          (p.email || '').toLowerCase() ===
          (input.patient.email || '').trim().toLowerCase()
      ) || null;
  }

  const body = {
    given_name: input.patient.givenName.trim(),
    family_name: input.patient.familyName.trim(),
    date_of_birth: input.patient.dateOfBirth,
    blood_type: input.patient.bloodType.trim() || null,
    sex_at_birth: input.patient.sexAtBirth.trim() || null,
    email: (input.patient.email || '').trim() || emailForMatch,
    phone: (input.patient.phoneNumber || '').trim() || null,
  };

  if (patient) {
    await requestJson<PatientApi>(`/api/patients/${patient.patient_id}/`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
    patient = await requestJson<PatientApi>(
      `/api/patients/${patient.patient_id}/`
    );
  } else {
    patient = await requestJson<PatientApi>('/api/patients/', {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  const pid = patient.patient_id;

  const [paRows, pmRows, piRows, pcRows, incRows] = await Promise.all([
    fetchAllPages<PatientAllergyApi & { id: number }>('/api/patient-allergies/'),
    fetchAllPages<PatientMedicationApi & { id: number }>(
      '/api/patient-medications/'
    ),
    fetchAllPages<PatientInsuranceApi & { id: number }>(
      '/api/patient-insurances/'
    ),
    fetchAllPages<PatientChronicDiseaseApi & { id: number }>(
      '/api/patient-chronic-diseases/'
    ),
    fetchAllPages<IncidentApi>('/api/incidents/'),
  ]);

  const [policiesForStash, providersForStash] = await Promise.all([
    fetchAllPages<InsurancePolicyApi>('/api/insurance-policies/'),
    fetchAllPages<InsuranceProviderApi>('/api/insurance-providers/'),
  ]);
  const policyByIdStash = new Map(
    policiesForStash.map((p) => [p.policy_id, p])
  );
  const providerByIdStash = new Map(
    providersForStash.map((p) => [p.provider_id, p])
  );
  const coverageByInsKey = new Map<string, Record<string, unknown>>();
  for (const row of piRows.filter((r) => r.patient === pid)) {
    const pol = policyByIdStash.get(row.policy);
    if (!pol) continue;
    const prov = providerByIdStash.get(pol.provider);
    const key = `${(prov?.name || '').trim().toLowerCase()}|${(pol.policy_number || '').trim().toLowerCase()}`;
    const cd = row.coverage_details;
    if (
      cd &&
      typeof cd === 'object' &&
      !Array.isArray(cd) &&
      Object.keys(cd).length > 0
    ) {
      coverageByInsKey.set(key, { ...(cd as Record<string, unknown>) });
    }
  }

  for (const row of paRows.filter((r) => r.patient === pid)) {
    if (row.id != null) await deleteById('/api/patient-allergies/', row.id);
  }
  for (const row of pmRows.filter((r) => r.patient === pid)) {
    if (row.id != null) await deleteById('/api/patient-medications/', row.id);
  }
  for (const row of piRows.filter((r) => r.patient === pid)) {
    if (row.id != null) await deleteById('/api/patient-insurances/', row.id);
  }
  for (const row of pcRows.filter((r) => r.patient === pid)) {
    if (row.id != null)
      await deleteById('/api/patient-chronic-diseases/', row.id);
  }
  for (const row of incRows.filter((r) => r.patient === pid)) {
    await apiRequest(`/api/incidents/${row.incident_id}/`, {
      method: 'DELETE',
    });
  }

  if (!input.noAllergies) {
    for (const a of input.allergies) {
      if (!(a.allergyName || '').trim()) continue;
      const aid = await ensureAllergyCatalog(a.allergyName);
      const typeLabel = (() => {
        const t = (a.allergyType || '').trim();
        if (!t) return '';
        if (t === 'Other') {
          const o = (a.allergyTypeOther || '').trim();
          return o ? `Other (${o})` : 'Other';
        }
        return t;
      })();
      const reactionNotes = [
        typeLabel ? `Type: ${typeLabel}` : '',
        (a.reactionNotes || '').trim()
          ? `Reaction: ${(a.reactionNotes || '').trim()}`
          : '',
        (a.lastObserved || '').trim()
          ? `LastObserved: ${(a.lastObserved || '').trim()}`
          : '',
      ]
        .filter(Boolean)
        .join(' / ');
      await requestJson<PatientAllergyApi>('/api/patient-allergies/', {
        method: 'POST',
        body: JSON.stringify({
          patient: pid,
          allergy: aid,
          severity: (a.severity || '').trim() || null,
          reaction_notes: reactionNotes || null,
        }),
      });
    }
  }

  for (const m of input.medications) {
    if (!(m.genericName || '').trim()) continue;
    const mid = await ensureMedicationCatalog(m.genericName, m.brandName);
    const purpose = (m.purpose || '').trim();
    const prescriber = (m.prescribingPhysician || '').trim();
    const dosing = [purpose ? `Purpose: ${purpose}` : ''].filter(Boolean).join('\n');
    const notes = [
      prescriber ? `Prescriber: ${prescriber}` : '',
      (m.notesMedication || '').trim(),
    ]
      .filter(Boolean)
      .join('\n');
    await requestJson<PatientMedicationApi>('/api/patient-medications/', {
      method: 'POST',
      body: JSON.stringify({
        patient: pid,
        medication: mid,
        dosage: (m.dosage || '').trim() || null,
        route: (m.route || '').trim() || null,
        frequency: (m.frequency || '').trim() || null,
        dosing_instructions: dosing || null,
        notes: notes || null,
        start_date: (m.startDate || '').trim() || null,
        end_date: (m.endDate || '').trim() || null,
      }),
    });
  }

  for (const ins of input.insurances) {
    if (!(ins.providerName || '').trim() || !(ins.policyNumber || '').trim())
      continue;
    const provId = await ensureInsuranceProvider(ins.providerName);
    let planName = (ins.planName || '').trim();
    if ((ins.groupNumber || '').trim()) {
      planName = planName
        ? `${planName} (Group: ${ins.groupNumber.trim()})`
        : `(Group: ${ins.groupNumber.trim()})`;
    }
    const policies = await fetchAllPages<InsurancePolicyApi>(
      '/api/insurance-policies/'
    );
    let policy = policies.find(
      (p) =>
        p.provider === provId &&
        p.policy_number === ins.policyNumber.trim()
    );
    if (!policy) {
      policy = await requestJson<InsurancePolicyApi>(
        '/api/insurance-policies/',
        {
          method: 'POST',
          body: JSON.stringify({
            provider: provId,
            policy_number: ins.policyNumber.trim(),
            plan_name: planName || null,
          }),
        }
      );
    } else if (planName) {
      await requestJson<InsurancePolicyApi>(
        `/api/insurance-policies/${policy.policy_id}/`,
        {
          method: 'PATCH',
          body: JSON.stringify({ plan_name: planName }),
        }
      );
    }
    const insKey = `${ins.providerName.trim().toLowerCase()}|${ins.policyNumber.trim().toLowerCase()}`;
    const preserved = coverageByInsKey.get(insKey) || {};
    await requestJson<PatientInsuranceApi>('/api/patient-insurances/', {
      method: 'POST',
      body: JSON.stringify({
        patient: pid,
        policy: policy.policy_id,
        member_id: (ins.memberID || '').trim() || null,
        start_date: (ins.startDate || '').trim() || null,
        end_date: (ins.endDate || '').trim() || null,
        coverage_details: preserved,
      }),
    });
  }

  for (const c of input.chronicConditions) {
    if (!(c.conditionName || '').trim()) continue;
    const did = await ensureDiseaseCatalog(c.conditionName, c.icdCode);
    await requestJson<PatientChronicDiseaseApi>(
      '/api/patient-chronic-diseases/',
      {
        method: 'POST',
        body: JSON.stringify({
          patient: pid,
          disease: did,
          diagnosis_date: (c.diagnosisDate || '').trim() || null,
          severity: (c.severity || '').trim() || null,
          pre_existing: (c.prexisting || '').toLowerCase() === 'yes',
          notes: (c.notesChronicConditions || '').trim() || null,
          is_active: true,
        }),
      }
    );
  }

  const hv = input.hospitalVisit;
  if ((hv.facilityName || '').trim() && (hv.visitDate || '').trim()) {
    const hid = await ensureHospital(hv.facilityName);
    const occurred = `${(hv.visitDate || '').trim()}T12:00:00Z`;
    const disc = (hv.dischargeDate || '').trim();
    const att = (hv.attendingPhysician || '').trim();
    const clinical = [
      disc ? `Discharge: ${disc}` : '',
      att ? `Attending: ${att}` : '',
    ]
      .filter(Boolean)
      .join('\n');
    await requestJson<IncidentApi>('/api/incidents/', {
      method: 'POST',
      body: JSON.stringify({
        patient: pid,
        hospital: hid,
        occurred_at: occurred,
        incident_type: (hv.visitType || '').trim() || 'Visit',
        summary: (hv.reason || '').trim() || '—',
        clinical_notes: clinical || null,
        diagnosis_code: (hv.reportId || '').trim() || null,
      }),
    });
  }
}
