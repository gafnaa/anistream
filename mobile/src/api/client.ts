export const API_URL = (process.env.EXPO_PUBLIC_API_URL || 'https://waf-server.tail1ec650.ts.net:5175').replace(/\/+$/, '');
const API_KEY = process.env.EXPO_PUBLIC_API_KEY || '';
const TIMEOUT_MS = 20_000;

/** Adds the public-access key to URLs served by our API (playback proxy URLs too). */
export function withApiKey(url: string): string {
  if (!API_KEY || !url.startsWith(`${API_URL}/`)) return url;
  return `${url}${url.includes('?') ? '&' : '?'}k=${encodeURIComponent(API_KEY)}`;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiGet<T>(path: string, params: Record<string, string | number | undefined> = {}, signal?: AbortSignal): Promise<T> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) query.set(key, String(value));
  }
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, TIMEOUT_MS);
  try {
    // URLSearchParams.size is not available on every React Native runtime; toString() is.
    const qs = query.toString();
    const response = await fetch(withApiKey(`${API_URL}${path}${qs ? `?${qs}` : ''}`), { signal: controller.signal });
    let body: unknown;
    try { body = await response.json(); } catch {
      throw new ApiError('The API returned an invalid JSON response.', response.status);
    }
    if (!response.ok) {
      const message = typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
        ? body.error : `API request failed (${response.status}).`;
      throw new ApiError(message, response.status);
    }
    // The server owns the response contract; endpoint types mirror its scraper output.
    return body as T;
  } catch (error) {
    if (timedOut) throw new ApiError('The API request timed out.');
    if (signal?.aborted) throw error;
    if (error instanceof ApiError) throw error;
    throw new ApiError('Could not connect to the API.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', abort);
  }
}
