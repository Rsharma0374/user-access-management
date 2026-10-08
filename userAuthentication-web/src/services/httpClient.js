/**
 * Shared HTTP client.
 *
 * - Prepends VITE_API_BASE_URL (or http://localhost:10009 for local dev via Vite proxy).
 * - Sends JSON bodies and expects JSON responses.
 * - Includes credentials (cookies) so the backend can read/set __Host-refresh.
 * - Attaches in-memory access token as:  Authorization: Bearer <token>
 * - Attaches current session ID as:       X-Session-Id: <sessionId>
 * - Normalises error responses into { message, errors? } shape.
 */

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:10009';
const DEBUG    = import.meta.env.VITE_DEBUG_API === 'true';

// ─── In-memory stores ─────────────────────────────────────────────────────────
// Neither value is ever written to localStorage / sessionStorage.

let _accessToken = null;
let _sessionId   = null;

export const tokenStore = {
  get:   ()    => _accessToken,
  set:   (tok) => { _accessToken = tok; },
  clear: ()    => { _accessToken = null; },
};

export const sessionStore = {
  get:   ()    => _sessionId,
  set:   (sid) => { _sessionId = sid; },
  clear: ()    => { _sessionId = null; },
};

// ─── Core request ─────────────────────────────────────────────────────────────

/**
 * @param {string} path - e.g. "/auth-service/v1/auth/login"
 * @param {RequestInit & { skipAuth?: boolean }} options
 * @returns {Promise<any>}
 * @throws {ApiError}
 */
export async function request(path, options = {}) {
  const { skipAuth = false, ...fetchOptions } = options;

  const headers = new Headers(fetchOptions.headers ?? {});
  headers.set('Content-Type', 'application/json');
  headers.set('Accept',       'application/json');

  if (!skipAuth && _accessToken) {
    headers.set('Authorization', `Bearer ${_accessToken}`);
  }
  if (!skipAuth && _sessionId) {
    headers.set('X-Session-Id', _sessionId);
  }

  const url = `${BASE_URL}${path}`;

  if (DEBUG) {
    console.debug('[httpClient]', fetchOptions.method ?? 'GET', url);
  }

  let response;
  try {
    response = await fetch(url, {
      ...fetchOptions,
      headers,
      credentials: 'include',
    });
  } catch {
    throw new ApiError('Network error — check your connection and try again.', 0, null);
  }

  if (response.status === 204) return null;

  let body = null;
  const ct = response.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    try { body = await response.json(); } catch { body = null; }
  } else {
    body = await response.text();
  }

  if (!response.ok) {
    const message =
      (body && typeof body === 'object' && body.message) ||
      httpStatusMessage(response.status);
    const errors = (body && typeof body === 'object' && body.errors) || null;
    throw new ApiError(message, response.status, errors);
  }

  return body;
}

// ─── ApiError ─────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(message, status, errors) {
    super(message);
    this.name   = 'ApiError';
    this.status = status;
    this.errors = errors;
  }

  get isNetworkError()  { return this.status === 0; }
  get isUnauthorized()  { return this.status === 401; }
  get isForbidden()     { return this.status === 403; }
  get isConflict()      { return this.status === 409; }
  get isServerError()   { return this.status >= 500; }
}

function httpStatusMessage(status) {
  const map = {
    400: 'The request contained invalid data.',
    401: 'Authentication failed. Please check your credentials.',
    403: 'You do not have permission to perform this action.',
    404: 'The requested resource was not found.',
    409: 'A conflict occurred. The resource may already exist.',
    429: 'Too many requests. Please wait a moment and try again.',
    500: 'An unexpected server error occurred. Please try again later.',
    503: 'The service is temporarily unavailable. Please try again later.',
  };
  return map[status] ?? `Request failed with status ${status}.`;
}
