/**
 * MediTap Django API (docker-compose maps backend → host :8080).
 * On a VM (e.g. GCP) the SPA hostname matches the API host; set VITE_API_BASE if you use a reverse proxy.
 */
export function getApiBase(): string {
  const envBase = (import.meta.env.VITE_API_BASE || '').trim();
  if (envBase) return envBase.replace(/\/$/, '');
  if (typeof window === 'undefined') return '';
  const { protocol, hostname } = window.location;
  if (!hostname) return '';
  return `${protocol}//${hostname}:8080`;
}

const API_BASE = getApiBase();

export default API_BASE;
