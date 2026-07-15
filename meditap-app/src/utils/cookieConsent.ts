/**
 * MediTap cookie consent — gates analytics scripts (CargoPulse pattern).
 * Consent levels: "essential" | "all"
 */

const COOKIE_NAME = 'mt_cookie_consent';
const MAX_AGE_DAYS = 365;

export type ConsentLevel = 'essential' | 'all';

const GA4_MEASUREMENT_ID = 'G-6NMZHPR945';

export function getConsentLevel(): ConsentLevel | '' {
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${COOKIE_NAME}=`)) {
      const val = decodeURIComponent(trimmed.substring(COOKIE_NAME.length + 1));
      if (val === 'all' || val === 'essential') return val;
    }
  }
  return '';
}

export function setConsentLevel(level: ConsentLevel): void {
  const maxAge = MAX_AGE_DAYS * 24 * 60 * 60;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie =
    `${COOKIE_NAME}=${encodeURIComponent(level)}; Path=/; Max-Age=${maxAge}; SameSite=Lax${secure}`;
}

function ensureGtagStub(): void {
  (window as any).dataLayer = (window as any).dataLayer || [];
  if (!(window as any).gtag) {
    (window as any).gtag = function (...args: any[]) {
      (window as any).dataLayer.push(args);
    };
  }
}

export function setDefaultConsentDenied(): void {
  ensureGtagStub();
  (window as any).gtag('consent', 'default', {
    analytics_storage: 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    wait_for_update: 500,
  });
}

function updateConsentGranted(): void {
  ensureGtagStub();
  (window as any).gtag('consent', 'update', {
    analytics_storage: 'granted',
    ad_storage: 'granted',
    ad_user_data: 'granted',
    ad_personalization: 'granted',
  });
}

let ga4Loaded = false;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.async = true;
    s.src = src;
    s.onload = () => resolve();
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

function loadGa4(): Promise<void> {
  if (!GA4_MEASUREMENT_ID || ga4Loaded) return Promise.resolve();
  return loadScript(
    `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA4_MEASUREMENT_ID)}`
  ).then(() => {
    ga4Loaded = true;
    (window as any).gtag('js', new Date());
    (window as any).gtag('config', GA4_MEASUREMENT_ID, { anonymize_ip: true });
  });
}

export function applyConsent(level: ConsentLevel): void {
  setConsentLevel(level);
  if (level !== 'all') return;

  updateConsentGranted();
  loadGa4().catch((err) => {
    console.warn('MediTap: GA4 load failed', err);
  });
}

export function initConsent(): boolean {
  setDefaultConsentDenied();
  const saved = getConsentLevel();
  if (saved === 'all') {
    applyConsent('all');
    return false;
  }
  if (saved === 'essential') {
    return false;
  }
  return true;
}
