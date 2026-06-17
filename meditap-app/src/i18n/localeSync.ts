/** Settings language toggle + bootstrap (must match Tab11 localStorage key). */
export const MEDITAP_LOCALE_LS_KEY = 'meditap_settings_locale';

export type MediTapLocale = 'en' | 'es' | 'zh';

export const DEFAULT_LOCALE: MediTapLocale = 'en';

export const SUPPORTED_LOCALES: readonly MediTapLocale[] = ['en', 'es', 'zh'] as const;

export function isMediTapLocale(value: string | null | undefined): value is MediTapLocale {
  return value === 'en' || value === 'es' || value === 'zh';
}

export function readMediTapLocale(): MediTapLocale {
  try {
    const stored = localStorage.getItem(MEDITAP_LOCALE_LS_KEY);
    if (isMediTapLocale(stored)) return stored;
  } catch {
    /* ignore */
  }
  return DEFAULT_LOCALE;
}

export function persistMediTapLocale(locale: MediTapLocale): void {
  try {
    localStorage.setItem(MEDITAP_LOCALE_LS_KEY, locale);
  } catch {
    /* ignore */
  }
}

/** Document language for accessibility, SEO, and locale-aware formatting. */
export function applyMediTapLocale(locale: MediTapLocale): void {
  const htmlLang: Record<MediTapLocale, string> = {
    en: 'en',
    es: 'es',
    zh: 'zh-Hans',
  };
  document.documentElement.lang = htmlLang[locale];
}

export function localeDisplayName(locale: MediTapLocale, inLocale: MediTapLocale): string {
  const names: Record<MediTapLocale, Record<MediTapLocale, string>> = {
    en: { en: 'English', es: 'Español', zh: '中文（简体）' },
    es: { en: 'Inglés', es: 'Español', zh: 'Chino (simplificado)' },
    zh: { en: '英语', es: '西班牙语', zh: '中文（简体）' },
  };
  return names[inLocale][locale];
}
