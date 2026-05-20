import { getApiBase } from '../config/api';

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

export async function submitSupportContact(payload: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): Promise<string> {
  const base = getApiBase();
  if (!base) throw new Error('API base URL is not configured.');
  const r = await fetch(`${base}/api/support/contact/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await parseJsonResponse(r);
  if (!r.ok) throw new Error(flattenErrors(body));
  return typeof body.detail === 'string'
    ? body.detail
    : 'Thank you. We received your message.';
}
