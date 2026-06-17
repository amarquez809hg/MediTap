import { describe, expect, it, beforeEach } from 'vitest';
import {
  DEFAULT_LOCALE,
  MEDITAP_LOCALE_LS_KEY,
  applyMediTapLocale,
  isMediTapLocale,
  localeDisplayName,
  persistMediTapLocale,
  readMediTapLocale,
} from './localeSync';

describe('localeSync', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = 'en';
  });

  it('defaults to English when unset', () => {
    expect(readMediTapLocale()).toBe(DEFAULT_LOCALE);
  });

  it('persists and reads Spanish', () => {
    persistMediTapLocale('es');
    expect(localStorage.getItem(MEDITAP_LOCALE_LS_KEY)).toBe('es');
    expect(readMediTapLocale()).toBe('es');
  });

  it('ignores invalid stored values', () => {
    localStorage.setItem(MEDITAP_LOCALE_LS_KEY, 'fr');
    expect(readMediTapLocale()).toBe('en');
  });

  it('sets document lang', () => {
    applyMediTapLocale('es');
    expect(document.documentElement.lang).toBe('es');
  });

  it('validates locale codes', () => {
    expect(isMediTapLocale('en')).toBe(true);
    expect(isMediTapLocale('es')).toBe(true);
    expect(isMediTapLocale('zh')).toBe(true);
    expect(isMediTapLocale('de')).toBe(false);
  });

  it('returns localized language names for Chinese', () => {
    expect(localeDisplayName('zh', 'en')).toBe('中文（简体）');
    expect(localeDisplayName('zh', 'zh')).toBe('中文（简体）');
  });

  it('sets document lang to zh-Hans for Chinese', () => {
    applyMediTapLocale('zh');
    expect(document.documentElement.lang).toBe('zh-Hans');
  });

  it('returns localized language names', () => {
    expect(localeDisplayName('es', 'en')).toBe('Español');
    expect(localeDisplayName('en', 'es')).toBe('Inglés');
  });
});
