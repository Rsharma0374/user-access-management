/**
 * MSW request handlers.
 *
 * Mirrors the actual Java backend contract so tests exercise the real service
 * and client layers rather than pure stubs.
 *
 * In Vitest's jsdom environment, relative fetch() URLs resolve to
 * http://localhost:10009 (Vitest's test server base). We register handlers at
 * that absolute base so MSW intercepts them correctly.
 */

import { http, HttpResponse } from 'msw';

// Vitest jsdom resolves relative URLs to this base
export const VITEST_BASE = 'http://localhost:10009';
const AUTH = `${VITEST_BASE}/auth-service/v1/auth`;

export const handlers = [
  // ── Register ──────────────────────────────────────────────────────────────
  http.post(`${AUTH}/register`, async ({ request }) => {
    const body = await request.json();
    if (body.email === 'existing@example.com') {
      return HttpResponse.json(
        { message: 'An account with this email already exists. Please sign in instead.' },
        { status: 409 },
      );
    }
    return HttpResponse.json(
      { message: 'Registration accepted. Please verify your email to activate your account.' },
      { status: 202 },
    );
  }),

  // ── Resend verification ───────────────────────────────────────────────────
  http.post(`${AUTH}/email/resend`, async () => {
    return HttpResponse.json(
      { message: 'If the account exists, a verification email has been sent' },
      { status: 202 },
    );
  }),

  // ── Email verify ──────────────────────────────────────────────────────────
  http.post(`${AUTH}/email/verify`, async ({ request }) => {
    const body = await request.json();
    if (body.token === 'expired-token') {
      return HttpResponse.json(
        { message: 'Invalid or expired verification token' },
        { status: 401 },
      );
    }
    return HttpResponse.json({ message: 'Email verified successfully' }, { status: 200 });
  }),

  // ── Login ─────────────────────────────────────────────────────────────────
  http.post(`${AUTH}/login`, async ({ request }) => {
    const body = await request.json();

    if (body.email === 'mfa@example.com' && body.password === 'Password1!') {
      return HttpResponse.json({
        type: 'MFA_REQUIRED',
        message: 'Additional verification is required.',
        challengeId: 'test-challenge-id-abc123',
      });
    }

    if (body.email === 'user@example.com' && body.password === 'Password1!') {
      return HttpResponse.json({
        type: 'SUCCESS',
        message: 'Login successful.',
        accessToken: 'test-access-token-xyz',
        sessionId: 'session-uuid-123',
      });
    }

    return HttpResponse.json(
      { message: 'Invalid credentials' },
      { status: 401 },
    );
  }),

  // ── MFA verify ────────────────────────────────────────────────────────────
  http.post(`${AUTH}/mfa/verify`, async ({ request }) => {
    const body = await request.json();
    if (body.code === '000000') {
      return HttpResponse.json(
        { message: 'Invalid MFA code' },
        { status: 401 },
      );
    }
    return HttpResponse.json({
      message: 'MFA verification successful.',
      accessToken: 'mfa-access-token-xyz',
      sessionId: 'mfa-session-uuid-456',
    });
  }),

  // ── Refresh ───────────────────────────────────────────────────────────────
  // Default: no valid refresh cookie → 401 (unauthenticated start state)
  http.post(`${AUTH}/refresh`, async () => {
    return HttpResponse.json(
      { message: 'Invalid refresh token' },
      { status: 401 },
    );
  }),

  // ── Logout ────────────────────────────────────────────────────────────────
  http.post(`${AUTH}/logout`, async () => {
    return HttpResponse.json({ message: 'Logged out' });
  }),

  // ── Logout all ────────────────────────────────────────────────────────────
  http.post(`${AUTH}/logout-all`, async () => {
    return HttpResponse.json({ message: 'All sessions revoked' });
  }),

  // ── Forgot password ───────────────────────────────────────────────────────
  http.post(`${AUTH}/forgot-password`, async () => {
    return HttpResponse.json(
      { message: 'If the account exists, a password reset email has been sent' },
      { status: 202 },
    );
  }),

  // ── Reset password ────────────────────────────────────────────────────────
  http.post(`${AUTH}/reset-password`, async ({ request }) => {
    const body = await request.json();

    if (body.token === 'expired-reset-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa') {
      return HttpResponse.json(
        { message: 'Invalid or expired reset token' },
        { status: 401 },
      );
    }

    if (body.token?.length >= 32) {
      return HttpResponse.json({ message: 'Password reset successfully' });
    }

    return HttpResponse.json({ message: 'Invalid token' }, { status: 400 });
  }),
];
