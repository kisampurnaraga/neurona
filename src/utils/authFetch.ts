/**
 * NEURONA — Automatic bearer-token injection for same-origin API calls.
 *
 * SECURITY CONTEXT
 * ----------------
 * Privileged routes (Founder Control Center, project mutations, credit-spending
 * generation endpoints) are protected server-side by `requireFounder` /
 * `verifyToken`, which validate a signed JWT.
 *
 * Historically the Founder Control Center identified itself by sending a plain
 * `x-role: founder` header. That was forgeable by anyone, so it has been removed.
 * Every API call now has to carry a real `Authorization: Bearer <jwt>` header.
 *
 * Rather than editing 40+ individual `fetch()` call sites (and risking missing
 * one), this module installs a single interceptor that attaches the stored JWT
 * to every same-origin `/api/...` request that does not already set one.
 */

const TOKEN_STORAGE_KEYS = ['neuronna_auth_token', 'neuronna_token'] as const;

/** Read the current session JWT from localStorage. */
export function getAuthToken(): string {
  try {
    for (const key of TOKEN_STORAGE_KEYS) {
      const value = localStorage.getItem(key);
      if (value && value.trim()) return value.trim();
    }
  } catch {
    /* localStorage unavailable (SSR / privacy mode) */
  }
  return '';
}

/** Headers object carrying the bearer token, for explicit call sites. */
export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = getAuthToken();
  return token ? { ...extra, Authorization: `Bearer ${token}` } : { ...extra };
}

function toUrlString(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input;
  if (typeof URL !== 'undefined' && input instanceof URL) return input.toString();
  if (typeof Request !== 'undefined' && input instanceof Request) return input.url;
  return '';
}

/**
 * True for requests we should authenticate: same-origin `/api/...` paths,
 * or absolute URLs pointing at our own origin.
 */
function isOwnApiRequest(url: string): boolean {
  if (!url) return false;
  if (url.startsWith('/api/')) return true;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin && parsed.pathname.startsWith('/api/');
  } catch {
    return false;
  }
}

let installed = false;

/** Install the interceptor. Safe to call more than once. */
export function installAuthFetchInterceptor(): void {
  if (installed || typeof window === 'undefined' || typeof window.fetch !== 'function') return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = toUrlString(input);
    const token = getAuthToken();

    if (!token || !isOwnApiRequest(url)) {
      return originalFetch(input as any, init);
    }

    try {
      const headers = new Headers(
        init?.headers ?? (typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined)
      );
      // An explicit header always wins (e.g. a different identity flow).
      if (!headers.has('Authorization')) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return originalFetch(input as any, { ...(init || {}), headers });
    } catch {
      return originalFetch(input as any, init);
    }
  };
}

/**
 * Build an EventSource URL that authenticates via query string.
 * The browser EventSource API cannot send custom headers, so the server
 * accepts `?token=` for GET requests only.
 */
export function withSseToken(path: string): string {
  const token = getAuthToken();
  if (!token) return path;
  const separator = path.includes('?') ? '&' : '?';
  return `${path}${separator}token=${encodeURIComponent(token)}`;
}
