/**
 * Authentication service.
 *
 * Owns all mappings between the frontend and the Java backend's API contract.
 * No component should import from httpClient directly for auth operations.
 *
 * Backend base path: /auth-service
 * All auth endpoints: /auth-service/v1/auth/*
 *
 * Every request includes `productName` as required by ProductAwareRequest.
 */

import { request, tokenStore, ApiError } from '../../../services/httpClient.js';

const PRODUCT_NAME = import.meta.env.VITE_PRODUCT_NAME ?? 'super-admin';
const BASE = '/auth-service/v1/auth';

/**
 * Returns the configured product name.
 * Components should use this rather than reading the env var directly.
 */
export function getProductName() {
  return PRODUCT_NAME;
}

// ─── Registration ─────────────────────────────────────────────────────────────

/**
 * Register a new account.
 * The backend returns 202 regardless of whether the email already exists
 * (to avoid account enumeration). Registration does NOT auto-login — the user
 * must verify their email before they can sign in.
 *
 * @param {{ email: string, password: string }} payload
 * @returns {Promise<{ message: string }>}
 */
export async function register({ email, password }) {
  return request(`${BASE}/register`, {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({ productName: PRODUCT_NAME, email, password }),
  });
}

/**
 * Resend the email verification message.
 * Always returns the same neutral message regardless of whether the account
 * exists, to avoid account enumeration.
 *
 * @param {{ email: string }} payload
 */
export async function resendVerification({ email }) {
  return request(`${BASE}/email/resend`, {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({ productName: PRODUCT_NAME, email }),
  });
}

/**
 * Submit the email verification token (used when the user lands on the
 * /verify-email page from a deep-linked token — not the GET link which the
 * backend handles directly with an HTML response).
 *
 * @param {{ token: string }} payload
 */
export async function verifyEmail({ token }) {
  return request(`${BASE}/email/verify`, {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({ productName: PRODUCT_NAME, token }),
  });
}

// ─── Login / Logout ──────────────────────────────────────────────────────────

/**
 * Authenticate with email + password.
 *
 * Returns one of:
 *   { type: 'SUCCESS', accessToken, sessionId, message }
 *   { type: 'MFA_REQUIRED', challengeId, message }
 *
 * On SUCCESS the access token is stored in the in-memory token store.
 * The refresh token is set by the backend as an HttpOnly cookie.
 *
 * @param {{ email: string, password: string, deviceId?: string, deviceName?: string }} payload
 */
export async function login({ email, password, deviceId, deviceName }) {
  const result = await request(`${BASE}/login`, {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({
      productName: PRODUCT_NAME,
      email,
      password,
      deviceId: deviceId ?? null,
      deviceName: deviceName ?? null,
    }),
  });

  if (result?.type === 'SUCCESS' && result.accessToken) {
    tokenStore.set(result.accessToken);
  }

  return result;
}

/**
 * Complete MFA verification after a login that returned MFA_REQUIRED.
 *
 * @param {{ challengeId: string, code: string, deviceId?: string, deviceName?: string }} payload
 */
export async function verifyMfa({ challengeId, code, deviceId, deviceName }) {
  const result = await request(`${BASE}/mfa/verify`, {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({
      productName: PRODUCT_NAME,
      challengeId,
      code,
      deviceId: deviceId ?? null,
      deviceName: deviceName ?? null,
    }),
  });

  if (result?.accessToken) {
    tokenStore.set(result.accessToken);
  }

  return result;
}

/**
 * Log out the current session. The backend clears the __Host-refresh cookie.
 * The in-memory access token is cleared unconditionally.
 */
export async function logout() {
  try {
    await request(`${BASE}/logout`, { method: 'POST' });
  } finally {
    tokenStore.clear();
  }
}

// ─── Token refresh ────────────────────────────────────────────────────────────

/**
 * Exchange the refresh token cookie for a new access token.
 * The refresh token is read from and replaced in the __Host-refresh cookie by
 * the backend — the frontend never sees it.
 *
 * @param {{ deviceId?: string }} payload
 * @returns {Promise<{ accessToken: string, sessionId: string }>}
 */
export async function refreshAccessToken({ deviceId } = {}) {
  const result = await request(`${BASE}/refresh`, {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({
      productName: PRODUCT_NAME,
      deviceId: deviceId ?? null,
    }),
  });

  if (result?.accessToken) {
    tokenStore.set(result.accessToken);
  }

  return result;
}

// ─── Password reset ───────────────────────────────────────────────────────────

/**
 * Request a password reset email.
 * Always returns the same neutral confirmation regardless of whether an account
 * exists for the given email.
 *
 * @param {{ email: string }} payload
 */
export async function forgotPassword({ email }) {
  return request(`${BASE}/forgot-password`, {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({ productName: PRODUCT_NAME, email }),
  });
}

/**
 * Reset the password using a token from the reset email link.
 *
 * The reset link sent by the backend has the format:
 *   <notification.base-url><password-reset-path>?token=<RAW_TOKEN>
 * e.g. http://localhost:10009/api/reset-password?token=XXX
 *
 * The frontend serves the reset-password page, reads `token` from the URL
 * query string, and passes it here.
 *
 * @param {{ token: string, password: string }} payload
 */
export async function resetPassword({ token, password }) {
  return request(`${BASE}/reset-password`, {
    method: 'POST',
    skipAuth: true,
    body: JSON.stringify({ productName: PRODUCT_NAME, token, password }),
  });
}

// ─── Session management (authenticated) ──────────────────────────────────────

/**
 * List all active sessions for the current user.
 */
export async function getSessions() {
  return request(`${BASE}/sessions`, { method: 'GET' });
}

/**
 * Revoke a specific session by its ID.
 * @param {string} sessionId  UUID string
 */
export async function revokeSession(sessionId) {
  return request(`${BASE}/sessions/${sessionId}`, { method: 'DELETE' });
}

/**
 * Revoke all sessions for the current user and clear the local token.
 */
export async function logoutAll() {
  try {
    await request(`${BASE}/logout-all`, { method: 'POST' });
  } finally {
    tokenStore.clear();
  }
}
