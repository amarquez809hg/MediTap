import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import i18n from '../i18n';
import {
  applyMediTapLocale,
  localeDisplayName,
  persistMediTapLocale,
  readMediTapLocale,
  type MediTapLocale,
} from '../i18n/localeSync';

type LanguageContextValue = {
  locale: MediTapLocale;
  setLocale: (locale: MediTapLocale) => void;
  localeLabel: (locale: MediTapLocale) => string;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<MediTapLocale>(() => readMediTapLocale());

  useEffect(() => {
    applyMediTapLocale(locale);
    void i18n.changeLanguage(locale);
  }, [locale]);

  const setLocale = useCallback((next: MediTapLocale) => {
    setLocaleState(next);
    persistMediTapLocale(next);
  }, []);

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
