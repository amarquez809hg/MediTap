import React, { useState } from 'react';
import { IonActionSheet } from '@ionic/react';
import { useTranslation } from 'react-i18next';
import { useLanguage } from '../contexts/LanguageContext';
import { SUPPORTED_LOCALES, type MediTapLocale } from '../i18n/localeSync';
import './HeaderLanguagePicker.css';

const LOCALE_SHORT: Record<MediTapLocale, string> = {
  en: 'EN',
  es: 'ES',
  zh: '中文',
};

export type HeaderLanguagePickerProps = {
  /** Extra classes (e.g. chronic-conditions-header__action-btn). */
  className?: string;
  /** App teal headers use glass buttons; login/public use nav link styling. */
  tone?: 'app' | 'nav';
};

const HeaderLanguagePicker: React.FC<HeaderLanguagePickerProps> = ({
  className = '',
  tone = 'app',
}) => {
  const { t } = useTranslation();
  const { locale, setLocale, localeLabel } = useLanguage();
  const [open, setOpen] = useState(false);

  const pickLocale = (next: MediTapLocale) => {
    setLocale(next);
    setOpen(false);
  };

  const toneClass =
    tone === 'nav' ? 'header-language-picker--nav' : 'header-language-picker--app';

  return (
    <>
      <button
        type="button"
        className={`header-language-picker ${toneClass} ${className}`.trim()}
        onClick={() => setOpen(true)}
        aria-label={`${t('language.label')}: ${localeLabel(locale)}`}
        title={t('language.choose')}
      >
        <i className="fas fa-globe" aria-hidden />
        <span className="header-language-picker__label">{LOCALE_SHORT[locale]}</span>
      </button>

      <IonActionSheet
        isOpen={open}
        onDidDismiss={() => setOpen(false)}
        header={t('language.choose')}
        buttons={[
          ...SUPPORTED_LOCALES.map((code) => ({
            text: localeLabel(code),
            cssClass: code === locale ? 'action-sheet-selected' : undefined,
            handler: () => pickLocale(code),
          })),
          {
            text: t('common.cancel'),
            role: 'cancel',
          },
        ]}
      />
    </>
  );
};

export default HeaderLanguagePicker;
