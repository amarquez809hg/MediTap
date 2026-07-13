import { getApiBase } from '../config/api';

export type SupportUserType = 'visitor' | 'patient' | 'staff';

export type SupportProblemCategory =
  | 'account'
  | 'intake'
  | 'document_upload'
  | 'epic_integration'
  | 'staff_access'
  | 'clinical_data'
  | 'technical'
  | 'privacy_security'
  | 'other';

export const SUPPORT_PROBLEM_CATEGORIES: SupportProblemCategory[] = [
  'account',
  'intake',
  'document_upload',
  'epic_integration',
  'staff_access',
  'clinical_data',
  'technical',
  'privacy_security',
  'other',
];

export const SUPPORT_USER_TYPES: SupportUserType[] = ['visitor', 'patient', 'staff'];

async function parseJsonResponse(r: Response): Promise<Record<string, unknown>> {
  const raw = await r.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return { detail: raw.slice(0, 400) };
  }
}

function flattenErrors(body: Record<string, unknown>): string {
  if (typeof body.detail === 'string') return body.detail;
  const parts: string[] = [];
  for (const [k, v] of Object.entries(body)) {
    if (k === 'detail') continue;
    if (Array.isArray(v)) parts.push(`${k}: ${v.join(' ')}`);
    else if (typeof v === 'string') parts.push(`${k}: ${v}`);
  }
  return parts.join(' — ') || 'Request failed.';
}

export async function requestPasswordReset(email: string): Promise<string> {
  const base = getApiBase();
  if (!base) throw new Error('API base URL is not configured.');
  const r = await fetch(`${base}/api/auth/password-reset/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  const body = await parseJsonResponse(r);
  if (!r.ok) throw new Error(flattenErrors(body));
  return typeof body.detail === 'string' ? body.detail : 'Check your email for reset instructions.';
}

export async function confirmPasswordReset(payload: {
  uid: string;
  token: string;
  password: string;
  password_confirm: string;
}): Promise<string> {
  const base = getApiBase();
  if (!base) throw new Error('API base URL is not configured.');
  const r = await fetch(`${base}/api/auth/password-reset/confirm/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await parseJsonResponse(r);
  if (!r.ok) throw new Error(flattenErrors(body));
  return typeof body.detail === 'string' ? body.detail : 'Password updated.';
}

export type SupportConfig = {
  contact_email: string;
  mail_configured: boolean;
};

export async function fetchSupportConfig(): Promise<SupportConfig> {
  const base = getApiBase();
  if (!base) {
    return { contact_email: 'support@meditap.ai', mail_configured: false };
  }
  try {
    const r = await fetch(`${base}/api/support/config/`);
    const body = await parseJsonResponse(r);
    if (!r.ok) {
      return { contact_email: 'support@meditap.ai', mail_configured: false };
    }
    return {
      contact_email:
        typeof body.contact_email === 'string' ? body.contact_email : 'support@meditap.ai',
      mail_configured: Boolean(body.mail_configured),
    };
  } catch {
    return { contact_email: 'support@meditap.ai', mail_configured: false };
  }
}

export async function submitSupportContact(payload: {
  name: string;
  email: string;
  user_type: SupportUserType;
  problem_category: SupportProblemCategory;
  phone?: string;
  message?: string;
}): Promise<string> {
  const base = getApiBase();
  if (!base) throw new Error('API base URL is not configured.');
  const r = await fetch(`${base}/api/support/contact/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: payload.name.trim(),
      email: payload.email.trim().toLowerCase(),
      user_type: payload.user_type,
      problem_category: payload.problem_category,
      phone: (payload.phone || '').trim(),
      message: (payload.message || '').trim(),
    }),
  });
  const body = await parseJsonResponse(r);
  if (!r.ok) throw new Error(flattenErrors(body));
  return typeof body.detail === 'string'
    ? body.detail
    : 'Thank you. We received your support request.';
}
