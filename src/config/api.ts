/**
 * Базовый URL API. Используется RTK Query (baseApi) и axios (authService).
 * Dev: VITE_API_URL или http://localhost:5000/api/v1/
 * Prod: VITE_API_URL или /api/v1/
 */
export function getApiBaseUrl(): string {
  const envUrl = import.meta.env.VITE_API_URL as string | undefined;
  if (envUrl) return envUrl.endsWith('/') ? envUrl : `${envUrl}/`;
  if (import.meta.env.DEV) return 'http://localhost:5000/api/v1/';
  return '/api/v1/';
}

/**
 * Origin сервера без суффикса `/api/v1` — для публичной статики `/api/uploads/...`
 * (она смонтирована вне `V1`; в img src нет заголовка Authorization).
 */
export function getServerOrigin(): string {
  return getApiBaseUrl()
    .replace(/\/api\/v1\/?$/i, '')
    .replace(/\/+$/, '');
}

/** Полный URL для путей из БД вроде `/api/uploads/email-screenshots/...`. */
export function resolvePublicUploadUrl(storedPath: string | null | undefined): string {
  if (storedPath == null) return '';
  const p = storedPath.trim();
  if (!p) return '';
  if (p.startsWith('http://') || p.startsWith('https://')) return p;
  const origin = getServerOrigin();
  const pathPart = p.startsWith('/') ? p : `/${p}`;
  return `${origin}${pathPart}`;
}
