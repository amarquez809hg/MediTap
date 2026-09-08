/**
 * Client-side secure password helpers for registration / reset flows.
 * Uses Web Crypto when available; never logs the generated secret.
 */

const LOWER = 'abcdefghijkmnopqrstuvwxyz';
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const SYMBOLS = '!@#$%^&*-_=+?';
const ALL = LOWER + UPPER + DIGITS + SYMBOLS;

export const DEFAULT_SECURE_PASSWORD_LENGTH = 16;
export const MIN_SECURE_PASSWORD_LENGTH = 8;

export type PasswordStrengthLevel = 'empty' | 'weak' | 'fair' | 'good' | 'strong';

export type PasswordStrength = {
  level: PasswordStrengthLevel;
  /** 0–100 for meter width */
  score: number;
  labelKey: string;
};

function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) return 0;
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buf = new Uint32Array(1);
    // Rejection sampling avoids modulo bias for small alphabets.
    const limit = Math.floor(0x100000000 / maxExclusive) * maxExclusive;
    let x = 0;
    do {
      crypto.getRandomValues(buf);
      x = buf[0]!;
    } while (x >= limit);
    return x % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

function pick(charset: string): string {
  return charset[randomInt(charset.length)]!;
}

function shuffle(chars: string[]): string[] {
  const out = [...chars];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    const tmp = out[i]!;
    out[i] = out[j]!;
    out[j] = tmp;
  }
  return out;
}

/**
 * Generate a high-entropy password with mixed character classes.
 * Default length 16 — comfortably above MediTap’s register minimum (8).
 */
export function generateSecurePassword(
  length: number = DEFAULT_SECURE_PASSWORD_LENGTH
): string {
  const len = Math.max(MIN_SECURE_PASSWORD_LENGTH, Math.min(64, Math.floor(length)));
  const required = [pick(LOWER), pick(UPPER), pick(DIGITS), pick(SYMBOLS)];
  const rest: string[] = [];
  for (let i = required.length; i < len; i += 1) {
    rest.push(pick(ALL));
  }
  return shuffle([...required, ...rest]).join('');
}

export function assessPasswordStrength(password: string): PasswordStrength {
  if (!password) {
    return { level: 'empty', score: 0, labelKey: 'passwordSecurity.strengthEmpty' };
  }

  let points = 0;
  const len = password.length;
  if (len >= 8) points += 20;
  if (len >= 12) points += 15;
  if (len >= 16) points += 15;
  if (/[a-z]/.test(password)) points += 12;
  if (/[A-Z]/.test(password)) points += 12;
  if (/\d/.test(password)) points += 12;
  if (/[^A-Za-z0-9]/.test(password)) points += 14;

  // Soft penalty for very common patterns (still allow strong generators).
  if (/^(password|123456|qwerty|meditap)/i.test(password)) points = Math.min(points, 25);
  if (/(.)\1{3,}/.test(password)) points -= 8;

  const score = Math.max(0, Math.min(100, points));
  if (score < 40) {
    return { level: 'weak', score, labelKey: 'passwordSecurity.strengthWeak' };
  }
  if (score < 60) {
    return { level: 'fair', score, labelKey: 'passwordSecurity.strengthFair' };
  }
  if (score < 80) {
    return { level: 'good', score, labelKey: 'passwordSecurity.strengthGood' };
  }
  return { level: 'strong', score, labelKey: 'passwordSecurity.strengthStrong' };
}
