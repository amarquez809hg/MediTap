import { describe, expect, it } from 'vitest';
import {
  assessPasswordStrength,
  generateSecurePassword,
  MIN_SECURE_PASSWORD_LENGTH,
} from './securePassword';

describe('securePassword', () => {
  it('generates mixed-class passwords of the requested length', () => {
    const pw = generateSecurePassword(16);
    expect(pw.length).toBe(16);
    expect(/[a-z]/.test(pw)).toBe(true);
    expect(/[A-Z]/.test(pw)).toBe(true);
    expect(/\d/.test(pw)).toBe(true);
    expect(/[^A-Za-z0-9]/.test(pw)).toBe(true);
  });

  it('enforces a minimum length', () => {
    expect(generateSecurePassword(4).length).toBe(MIN_SECURE_PASSWORD_LENGTH);
  });

  it('scores empty / weak / strong appropriately', () => {
    expect(assessPasswordStrength('').level).toBe('empty');
    expect(assessPasswordStrength('abc').level).toBe('weak');
    const strong = generateSecurePassword(20);
    expect(['good', 'strong']).toContain(assessPasswordStrength(strong).level);
  });

  it('produces different values across calls', () => {
    const a = generateSecurePassword(16);
    const b = generateSecurePassword(16);
    // Extremely unlikely to collide for 16-char crypto passwords
    expect(a).not.toBe(b);
  });
});
