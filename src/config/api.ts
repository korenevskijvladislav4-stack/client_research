/**
 * Базовый URL API. Используется RTK Query (baseApi) и axios (authService).
 * Dev: VITE_API_URL или http://localhost:5000/api/
 * Prod: VITE_API_URL или /api/
 */
export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl) return envUrl.endsWith('/') ? envUrl : `${envUrl}/`;
  if (import.meta.env.DEV) return 'http://localhost:5000/api/';
  return '/api/';
}
