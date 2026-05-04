import { Capacitor } from '@capacitor/core';

function defaultNativeApiBase(): string {
  const p = Capacitor.getPlatform();
  // iOS Simulator: localhost hits the Mac host reliably; Android emulator uses special loopback.
  if (p === 'ios') return 'http://localhost:8080';
  if (p === 'android') return 'http://10.0.2.2:8080';
  return 'http://127.0.0.1:8080';
}

/**
 * MediTap Django API.
 * - Set `VITE_API_BASE` when the API is not inferred correctly (required for some deploys).
 * - **Capacitor iOS/Android:** the WebView origin is `capacitor://localhost` — Django must allow it in CORS.
 *   Defaults: iOS → `http://localhost:8080`, Android emulator → `http://10.0.2.2:8080`, else `http://127.0.0.1:8080`.
 *   Override with `VITE_NATIVE_API_BASE` or `VITE_API_BASE`.
 * - Local dev in a desktop browser (localhost / 127.0.0.1): defaults to port 8080 (docker-compose backend).
 * - Deployed SPA (e.g. https://meditap.ai): defaults to the **current origin** (reverse proxy `/api`).
 */
export function getApiBase(): string {
  const envBase = (import.meta.env.VITE_API_BASE || '').trim();
  if (envBase) return envBase.replace(/\/$/, '');

  if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
    const native =
      (import.meta.env.VITE_NATIVE_API_BASE as string | undefined)?.trim() ||
      defaultNativeApiBase();
    return native.replace(/\/$/, '');
  }

  if (typeof window === 'undefined') return '';
  const { protocol, hostname, port } = window.location;
  if (!hostname) return '';
  const isLocalDev =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '[::1]';
  if (isLocalDev) {
    return `${protocol}//${hostname}:8080`;
  }
  const hostPort = port ? `${hostname}:${port}` : hostname;
  return `${protocol}//${hostPort}`;
}

const API_BASE = getApiBase();

export default API_BASE;
