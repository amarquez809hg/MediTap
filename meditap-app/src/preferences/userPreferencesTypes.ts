import { isMediTapLocale, type MediTapLocale } from '../i18n/localeSync';

export type CardStatus = 'active' | 'reported_lost' | 'inactive';

export type UserPreferences = {
  locale: MediTapLocale;
  dark_mode: boolean;
  push_notifications: boolean;
  card_status: CardStatus;
  card_reported_at: string | null;
  updated_at?: string;
};

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  locale: 'en',
  dark_mode: false,
  push_notifications: true,
  card_status: 'active',
  card_reported_at: null,
};

export function normalizeUserPreferences(
  raw: Partial<UserPreferences> | null | undefined
): UserPreferences {
  const locale = isMediTapLocale(raw?.locale) ? raw.locale : 'en';
  const card = raw?.card_status;
  const card_status: CardStatus =
    card === 'reported_lost' || card === 'inactive' ? card : 'active';
  return {
    locale,
    dark_mode: Boolean(raw?.dark_mode),
    push_notifications: raw?.push_notifications !== false,
    card_status,
    card_reported_at:
      typeof raw?.card_reported_at === 'string' ? raw.card_reported_at : null,
    updated_at: raw?.updated_at,
  };
}

export function mergeUserPreferences(
  base: UserPreferences,
  patch: Partial<UserPreferences>
): UserPreferences {
  return normalizeUserPreferences({ ...base, ...patch });
}
