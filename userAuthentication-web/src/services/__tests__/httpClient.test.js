import { describe, it, expect, beforeEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/mswServer.js';
import { request, ApiError, tokenStore } from '../httpClient.js';

// In Vitest's jsdom environment, relative fetch() URLs resolve relative to
// the jsdom base, which Vitest sets to http://localhost:10009 (matching the
// configured dev server). MSW intercepts the resolved absolute URL, so we
// register handlers at that base.
const TEST_BASE = 'http://localhost:10009';

beforeEach(() => {
  tokenStore.clear();
});

describe('request()', () => {
  it('returns parsed JSON on 200', async () => {
    server.use(
      http.get(`${TEST_BASE}/test/ok`, () => HttpResponse.json({ hello: 'world' })),
    );
    const data = await request('/test/ok', { method: 'GET' });
    expect(data).toEqual({ hello: 'world' });
  });

  it('returns null on 204', async () => {
    server.use(
      http.get(`${TEST_BASE}/test/no-content`, () => new HttpResponse(null, { status: 204 })),
    );
    const data = await request('/test/no-content', { method: 'GET' });
    expect(data).toBeNull();
  });

  it('throws ApiError on 401 with backend message', async () => {
    server.use(
      http.get(`${TEST_BASE}/test/unauth`, () =>
        HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 }),
      ),
    );
    await expect(request('/test/unauth', { method: 'GET' })).rejects.toMatchObject({
      name: 'ApiError',
      status: 401,
      message: 'Invalid credentials',
    });
  });

  it('throws ApiError with field errors on 400', async () => {
    server.use(
      http.post(`${TEST_BASE}/test/validate`, () =>
        HttpResponse.json(
          { message: 'Validation failed', errors: { email: 'Invalid email' } },
          { status: 400 },
        ),
      ),
    );
    let caught;
    try {
      await request('/test/validate', { method: 'POST', body: '{}' });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApiError);
    expect(caught.errors).toEqual({ email: 'Invalid email' });
  });

  it('attaches Authorization header when token is set', async () => {
    let capturedAuth = null;
    server.use(
      http.get(`${TEST_BASE}/test/protected`, ({ request: req }) => {
        capturedAuth = req.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      }),
    );
    tokenStore.set('my-test-token');
    await request('/test/protected', { method: 'GET' });
    expect(capturedAuth).toBe('Bearer my-test-token');
  });

  it('skips Authorization header when skipAuth is true', async () => {
    let capturedAuth = null;
    server.use(
      http.get(`${TEST_BASE}/test/public`, ({ request: req }) => {
        capturedAuth = req.headers.get('Authorization');
        return HttpResponse.json({ ok: true });
      }),
    );
    tokenStore.set('my-test-token');
    await request('/test/public', { method: 'GET', skipAuth: true });
    expect(capturedAuth).toBeNull();
  });

  it('throws ApiError with isNetworkError=true on fetch failure', async () => {
    // MSW v2: HttpResponse.error() simulates a network-level failure
    server.use(
      http.get(`${TEST_BASE}/test/network-fail`, () => HttpResponse.error()),
    );
    const err = await request('/test/network-fail', { method: 'GET' }).catch((e) => e);
    expect(err.name).toBe('ApiError');
    expect(err.status).toBe(0);
    expect(err.isNetworkError).toBe(true);
  });
});

describe('ApiError', () => {
  it('isUnauthorized is true for 401', () => {
    const err = new ApiError('msg', 401, null);
    expect(err.isUnauthorized).toBe(true);
  });

  it('isConflict is true for 409', () => {
    const err = new ApiError('msg', 409, null);
    expect(err.isConflict).toBe(true);
  });

  it('isServerError is true for 500', () => {
    const err = new ApiError('msg', 500, null);
    expect(err.isServerError).toBe(true);
  });

  it('isNetworkError is true for status 0', () => {
    const err = new ApiError('msg', 0, null);
    expect(err.isNetworkError).toBe(true);
  });
});

describe('tokenStore', () => {
  it('stores and retrieves a token', () => {
    tokenStore.set('tok-123');
    expect(tokenStore.get()).toBe('tok-123');
  });

  it('clears the token', () => {
    tokenStore.set('tok-123');
    tokenStore.clear();
    expect(tokenStore.get()).toBeNull();
  });
});
