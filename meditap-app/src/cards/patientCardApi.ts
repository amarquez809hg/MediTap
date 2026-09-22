import { getApiBase } from '../config/api';
import { getAuthHeaders } from '../auth/getAuthHeaders';

export type PatientCardRow = {
  card_id: string;
  patient_id: string;
  card_uid: string;
  label: string;
  revoked_at: string | null;
  created_at: string;
  token?: string;
  url?: string;
};

async function cardRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = await getAuthHeaders();
  const response = await fetch(`${getApiBase()}${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers || {}) },
  });
  const text = await response.text();
  const body = text ? (JSON.parse(text) as T & { detail?: string }) : ({} as T & { detail?: string });
  if (!response.ok) {
    const detail = typeof body.detail === 'string' ? body.detail : response.statusText;
    throw new Error(detail || `Request failed (${response.status})`);
  }
  return body;
}

export function listPatientCards(patientId: string): Promise<PatientCardRow[]> {
  return cardRequest<PatientCardRow[]>(
    `/api/patient-cards/?patient=${encodeURIComponent(patientId)}`,
  );
}

export function issuePatientCard(patientId: string): Promise<PatientCardRow> {
  const baseUrl = window.location.origin;
  return cardRequest<PatientCardRow>('/api/patient-cards/', {
    method: 'POST',
    body: JSON.stringify({ patient: patientId, base_url: baseUrl, label: 'profile card' }),
  });
}

export function bindPatientCardUid(
  cardId: string,
  cardUid: string,
  counter?: number,
): Promise<PatientCardRow> {
  return cardRequest<PatientCardRow>(`/api/patient-cards/${cardId}/bind-uid/`, {
    method: 'POST',
    body: JSON.stringify({
      card_uid: cardUid,
      ...(counter === undefined ? {} : { counter }),
    }),
  });
}

export function listCardDirectory(): Promise<CardDirectoryRow[]> {
  return cardRequest<CardDirectoryRow[]>('/api/patient-cards/directory/');
}

export type IssuedSunCard = PatientCardRow & {
  patient_name?: string;
  sun_url: string;
  sun_key: string;
  burn_command: string;
};

export function assignCardToPatient(patientId: string): Promise<IssuedSunCard> {
  const baseUrl = window.location.origin;
  return cardRequest<IssuedSunCard>('/api/patient-cards/assign/', {
    method: 'POST',
    body: JSON.stringify({ patient: patientId, base_url: baseUrl }),
  });
}

export type CardDirectoryRow = {
  patient_id: string;
  given_name: string;
  family_name: string;
  date_of_birth: string;
  email: string;
  username: string;
  cards: PatientCardRow[];
};

export function revokePatientCard(cardId: string): Promise<PatientCardRow> {
  return cardRequest<PatientCardRow>(`/api/patient-cards/${cardId}/revoke/`, {
    method: 'POST',
  });
}
