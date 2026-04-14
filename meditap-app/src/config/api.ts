/**
 * MediTap Django API (docker-compose maps backend → host :8080).
 */
export function getApiBase(): string {
  const envBase = (import.meta.env.VITE_API_BASE || '').trim();
  if (envBase) return envBase.replace(/\/$/, '');
  if (typeof window === 'undefined') return '';
  const h = window.location.hostname;
  if (h === 'localhost' || h === '127.0.0.1') {
    return `http://${h}:8080`;
  }
  return '';
}

const API_BASE = getApiBase();

export default API_BASE;
