/** Settings toggle + bootstrap (must match Tab11 localStorage key). */
export const MEDITAP_DARK_MODE_LS_KEY = 'meditap_settings_dark_mode';

export function readMediTapDarkMode(): boolean {
  try {
    return localStorage.getItem(MEDITAP_DARK_MODE_LS_KEY) === '1';
  } catch {
    return false;
  }
}

export function persistMediTapDarkMode(enabled: boolean): void {
  try {
    localStorage.setItem(MEDITAP_DARK_MODE_LS_KEY, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}

/** Apply Ionic class + browser color-scheme everywhere Ionic expects it. */
export function applyMediTapDarkMode(enabled: boolean): void {
  const { documentElement: root, body } = document;
  root.classList.toggle('ion-palette-dark', enabled);
  body.classList.toggle('ion-palette-dark', enabled);
  root.style.setProperty('color-scheme', enabled ? 'dark' : 'light');

  const meta = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (meta) {
    meta.setAttribute('content', enabled ? 'dark light' : 'light dark');
  }

  const paintIonApp = () => {
    document.querySelector('ion-app')?.classList.toggle('ion-palette-dark', enabled);
  };
  paintIonApp();
  requestAnimationFrame(paintIonApp);
}

export function syncMediTapDarkModeFromStorage(): void {
  applyMediTapDarkMode(readMediTapDarkMode());
}
