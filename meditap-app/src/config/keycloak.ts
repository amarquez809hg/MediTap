import Keycloak from 'keycloak-js';

/**
 * Base URL the browser uses to reach Keycloak (must match how you open the app).
 * - VITE_KEYCLOAK_URL=auto → same hostname as the SPA, port 8081 (works on LAN phones/tablets).
 * - Otherwise use the explicit URL from env.
 */
export function getKeycloakBaseUrl(): string {
  const raw = (import.meta.env.VITE_KEYCLOAK_URL || '').trim();
  if (raw && raw.toLowerCase() !== 'auto') {
    return raw.replace(/\/$/, '');
  }
  if (typeof window !== 'undefined') {
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:8081`;
  }
  return 'http://localhost:8081';
}

let instance: Keycloak | null = null;
let instanceBaseUrl: string | null = null;

export function getKeycloak(): Keycloak {
  const url = getKeycloakBaseUrl();
  if (!instance || instanceBaseUrl !== url) {
    instanceBaseUrl = url;
    const realm = import.meta.env.VITE_KEYCLOAK_REALM || 'meditap';
    const clientId = import.meta.env.VITE_KEYCLOAK_CLIENT_ID || 'meditap-spa';
    instance = new Keycloak({ url, realm, clientId });
  }
  return instance;
}

export function getPostLoginPath(): string {
  return import.meta.env.VITE_KEYCLOAK_REDIRECT_PATH || '/tab3';
}

/**
 * Keycloak Identity Provider alias for Google (Realm → Identity providers).
 * Default broker alias when you add “Google” in Admin is usually `google`.
 */
export function getKeycloakGoogleIdpHint(): string {
  const raw = (import.meta.env.VITE_KEYCLOAK_IDP_GOOGLE || '').trim();
  return raw || 'google';
}
