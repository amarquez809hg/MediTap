import { describe, expect, it } from 'vitest';
import {
  DEFAULT_USER_PREFERENCES,
  mergeUserPreferences,
  normalizeUserPreferences,
} from './userPreferencesTypes';

describe('userPreferencesTypes', () => {
  it('normalizes partial payloads', () => {
    expect(
      normalizeUserPreferences({
        locale: 'es',
        dark_mode: true,
        push_notifications: false,
        card_status: 'reported_lost',
        card_reported_at: '2026-01-01T00:00:00.000Z',
      })
    ).toEqual({
      locale: 'es',
      dark_mode: true,
      push_notifications: false,
      card_status: 'reported_lost',
      card_reported_at: '2026-01-01T00:00:00.000Z',
      updated_at: undefined,
    });
  });

  it('falls back to defaults for invalid values', () => {
    expect(
      normalizeUserPreferences({
        locale: 'fr' as 'en',
        card_status: 'unknown' as 'active',
      })
    ).toEqual(DEFAULT_USER_PREFERENCES);
  });

  it('merges patches', () => {
    expect(mergeUserPreferences(DEFAULT_USER_PREFERENCES, { locale: 'es' }).locale).toBe('es');
  });
});
