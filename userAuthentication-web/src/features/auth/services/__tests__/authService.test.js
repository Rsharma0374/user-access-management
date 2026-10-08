import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../../test/mswServer.js';
import { VITEST_BASE } from '../../../../test/handlers.js';
import {
  login,
  register,
  forgotPassword,
  resetPassword,
  logout,
  resendVerification,
} from '../authService.js';
import { tokenStore, ApiError } from '../../../../services/httpClient.js';

const BASE = `${VITEST_BASE}/auth-service/v1/auth`;

beforeEach(() => {
  tokenStore.clear();
});

// ── register ──────────────────────────────────────────────────────────────────
describe('register()', () => {
  it('returns accepted message on new email', async () => {
    const result = await register({ email: 'new@example.com', password: 'Password1!' });
    expect(result.message).toMatch(/registration accepted/i);
  });

  it('throws ApiError 409 for existing email', async () => {
    await expect(
      register({ email: 'existing@example.com', password: 'Password1!' }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

// ── login ─────────────────────────────────────────────────────────────────────
describe('login()', () => {
  it('returns SUCCESS type and stores access token', async () => {
    const result = await login({ email: 'user@example.com', password: 'Password1!' });
    expect(result.type).toBe('SUCCESS');
    expect(result.accessToken).toBe('test-access-token-xyz');
    expect(tokenStore.get()).toBe('test-access-token-xyz');
  });

  it('returns MFA_REQUIRED type without storing a token', async () => {
    const result = await login({ email: 'mfa@example.com', password: 'Password1!' });
    expect(result.type).toBe('MFA_REQUIRED');
    expect(result.challengeId).toBe('test-challenge-id-abc123');
    expect(tokenStore.get()).toBeNull();
  });

  it('throws ApiError 401 on bad credentials', async () => {
    await expect(
      login({ email: 'bad@example.com', password: 'wrongpassword' }),
    ).rejects.toMatchObject({ status: 401 });
  });

  it('includes productName in request body', async () => {
    let body = null;
    server.use(
      http.post(`${BASE}/login`, async ({ request: req }) => {
        body = await req.json();
        return HttpResponse.json({
          type: 'SUCCESS',
          accessToken: 'tok',
          sessionId: 's1',
          message: 'ok',
        });
      }),
    );
    await login({ email: 'user@example.com', password: 'Password1!' });
    expect(body.productName).toBeDefined();
    expect(typeof body.productName).toBe('string');
  });
});

// ── forgotPassword ────────────────────────────────────────────────────────────
describe('forgotPassword()', () => {
  it('returns the neutral confirmation message', async () => {
    const result = await forgotPassword({ email: 'anyone@example.com' });
    expect(result.message).toMatch(/if the account exists/i);
  });
});

// ── resetPassword ─────────────────────────────────────────────────────────────
describe('resetPassword()', () => {
  it('resets password with a valid token', async () => {
    const validToken = 'a'.repeat(32);
    const result = await resetPassword({ token: validToken, password: 'NewPass123!' });
    expect(result.message).toMatch(/password reset successfully/i);
  });

  it('throws ApiError 401 for expired token', async () => {
    const expiredToken = 'expired-reset-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    await expect(
      resetPassword({ token: expiredToken, password: 'NewPass123!' }),
    ).rejects.toMatchObject({ status: 401 });
  });
});

// ── logout ────────────────────────────────────────────────────────────────────
describe('logout()', () => {
  it('clears the in-memory token on success', async () => {
    tokenStore.set('some-token');
    await logout();
    expect(tokenStore.get()).toBeNull();
  });

  it('clears the token even when the server returns an error', async () => {
    server.use(
      http.post(`${BASE}/logout`, () =>
        HttpResponse.json({ message: 'Server error' }, { status: 500 }),
      ),
    );
    tokenStore.set('some-token');
    // logout() catches errors internally and always clears the token
    await logout().catch(() => {});
    expect(tokenStore.get()).toBeNull();
  });
});

// ── resendVerification ────────────────────────────────────────────────────────
describe('resendVerification()', () => {
  it('always returns the neutral message', async () => {
    const result = await resendVerification({ email: 'any@example.com' });
    expect(result.message).toMatch(/if the account exists/i);
  });
});
