import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import {
  localeDisplayName,
  type MediTapLocale,
} from '../i18n/localeSync';
import { useProfileLocale } from './UserPreferencesContext';

type LanguageContextValue = {
  locale: MediTapLocale;
  setLocale: (locale: MediTapLocale) => void;
  localeLabel: (locale: MediTapLocale) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { locale, setLocale: setProfileLocale } = useProfileLocale();

  const setLocale = useCallback(
    (next: MediTapLocale) => {
      void setProfileLocale(next);
    },
    [setProfileLocale]
  );

  const localeLabel = useCallback(
    (target: MediTapLocale) => localeDisplayName(target, locale),
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, localeLabel }),
    [locale, setLocale, localeLabel]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
};

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage must be used within LanguageProvider');
  }
  return ctx;
}
