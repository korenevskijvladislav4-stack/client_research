/**
 * Validate env at app load. In prod with explicit VITE_API_URL, it must be a valid URL.
 * If unset in prod, app uses relative /api/ (same-origin).
 */
export function validateEnv(): void {
  const url = import.meta.env.VITE_API_URL as string | undefined;
  if (url !== undefined && url !== '' && url.trim() !== '') {
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      throw new Error(
        `Invalid VITE_API_URL: "${url}". Must be a valid base URL (e.g. https://api.example.com).`
      );
    }
  }
}
