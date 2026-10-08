/**
 * Admin API service layer.
 *
 * Attempts real API calls first. Falls back to mock data when:
 *   1. VITE_ADMIN_MOCK=true is set explicitly, OR
 *   2. The real endpoint returns 404 (not yet implemented on the backend).
 *
 * NEVER silently reports a mocked operation as a real one — all mock
 * responses carry { _mock: true } so callers can surface a visible banner.
 *
 * Real endpoints (when backend is ready):
 *   GET    /auth-service/v1/admin/products
 *   GET    /auth-service/v1/admin/users?productName=&search=&mfaFilter=
 *   POST   /auth-service/v1/admin/users
 *   PATCH  /auth-service/v1/admin/users/:id/mfa
 */

import { request, ApiError } from '../../../services/httpClient.js';
import { mockApi } from './mockData.js';

const MOCK_MODE = import.meta.env.VITE_ADMIN_MOCK === 'true';
const BASE = '/auth-service/v1/admin';

// ─── Response normalisation ─────────────────────────────────────────────────────
// The backend returns a leaner shape than the dashboard UI consumes. These
// adapters map the raw API payloads onto the internal view model so the rest of
// the app can stay agnostic to the wire format. The mock layer already emits the
// internal shape, so normalisation is applied only to real responses.

/**
 * Coerce an API payload into an array of records.
 * Handles bare arrays as well as common envelope shapes ({ data }, { content },
 * { items }, { results }).
 */
function toArray(body) {
  if (Array.isArray(body)) return body;
  if (body && typeof body === 'object') {
    for (const key of ['data', 'content', 'items', 'results']) {
      if (Array.isArray(body[key])) return body[key];
    }
  }
  return [];
}

/**
 * Map a raw product record from GET /v1/admin/products onto the view model.
 *
 * Wire shape:  { productName, displayName, active, settings, createdAt, updatedAt }
 * View model:  { id, name, status, active, settings, createdAt, updatedAt,
 *                userCount?, mfaEnabledCount? }
 *
 * `userCount` / `mfaEnabledCount` are not exposed by this endpoint; they are
 * passed through when present and left undefined otherwise, letting the UI show
 * a "no data" state rather than a misleading zero.
 */
export function normalizeProduct(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  // Already in view-model shape (e.g. mock data) — pass through untouched.
  if ('id' in raw && 'name' in raw && !('displayName' in raw)) return raw;

  return {
    id: raw.productName,
    name: raw.displayName ?? raw.productName,
    status: raw.active ? 'ACTIVE' : 'INACTIVE',
    active: raw.active ?? false,
    settings: raw.settings ?? {},
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
    // Per-product aggregates are not returned by this endpoint.
    userCount: raw.userCount,
    mfaEnabledCount: raw.mfaEnabledCount,
  };
}

/**
 * Map a raw user record from GET /v1/admin/users onto the view model.
 *
 * Wire shape:  { id, productName, email, status, emailVerifiedAt, createdAt, updatedAt }
 * View model:  { id, email, fullName, productName, role, status, mfaEnabled,
 *                emailVerifiedAt, createdAt, updatedAt }
 *
 * `fullName`, `role` and `mfaEnabled` are not present on the admin listing
 * endpoint; they are preserved when the backend does send them (e.g. the create
 * / MFA-toggle responses) and defaulted sensibly otherwise.
 */
export function normalizeUser(raw) {
  if (!raw || typeof raw !== 'object') return raw;
  // Already in view-model shape (e.g. mock data) — pass through untouched.
  if ('fullName' in raw && !('emailVerifiedAt' in raw)) return raw;

  return {
    id: raw.id,
    email: raw.email,
    fullName: raw.fullName ?? '',
    productName: raw.productName,
    role: raw.role ?? null,
    status: raw.status,
    mfaEnabled: raw.mfaEnabled ?? false,
    emailVerifiedAt: raw.emailVerifiedAt ?? null,
    createdAt: raw.createdAt ?? null,
    updatedAt: raw.updatedAt ?? null,
  };
}

/**
 * Wrap a real API call; fall back to mock on 404 (endpoint not yet live).
 * Returns { data, _mock } where _mock=true when mock was used.
 */
async function withMockFallback(realFn, mockFn) {
  if (MOCK_MODE) {
    const data = await mockFn();
    return { data, _mock: true };
  }
  try {
    const data = await realFn();
    return { data, _mock: false };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 0)) {
      // Backend endpoint not yet live — use mock
      const data = await mockFn();
      return { data, _mock: true };
    }
    throw err;
  }
}

// ─── Products ─────────────────────────────────────────────────────────────────

/**
 * List all products with summary metrics.
 * @returns {Promise<{ data: Product[], _mock: boolean }>}
 */
export async function getProducts() {
  return withMockFallback(
    async () => {
      const body = await request(`${BASE}/products`, { method: 'GET' });
      return toArray(body).map(normalizeProduct);
    },
    () => mockApi.getProducts(),
  );
}

// ─── Users ────────────────────────────────────────────────────────────────────

/**
 * List users, optionally scoped to a product.
 *
 * @param {{ productName?: string, search?: string, mfaFilter?: 'all'|'enabled'|'disabled' }} params
 * @returns {Promise<{ data: User[], _mock: boolean }>}
 */
export async function getUsers(params = {}) {
  const qs = new URLSearchParams();
  if (params.productName && params.productName !== 'all') {
    qs.set('productName', params.productName);
  }
  if (params.search) qs.set('search', params.search);
  if (params.mfaFilter && params.mfaFilter !== 'all') {
    qs.set('mfaFilter', params.mfaFilter);
  }

  const query = qs.toString() ? `?${qs.toString()}` : '';

  return withMockFallback(
    async () => {
      const body = await request(`${BASE}/users${query}`, { method: 'GET' });
      return toArray(body).map(normalizeUser);
    },
    () => mockApi.getUsers(params),
  );
}

/**
 * Create a new user assigned to a product.
 *
 * @param {{ fullName: string, email: string, password: string, productName: string, role: string, mfaEnabled: boolean }} payload
 * @returns {Promise<{ data: User, _mock: boolean }>}
 */
export async function createUser(payload) {
  return withMockFallback(
    async () => {
      const body = await request(`${BASE}/users`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      return normalizeUser(body);
    },
    () => mockApi.createUser(payload),
  );
}

/**
 * Toggle MFA for a user.
 * Only callable by super-admin — enforced both client-side (RBAC guard)
 * and server-side (backend authorization).
 *
 * @param {string} userId
 * @param {boolean} mfaEnabled
 * @returns {Promise<{ data: User, _mock: boolean }>}
 */
export async function toggleUserMfa(userId, mfaEnabled) {
  return withMockFallback(
    async () => {
      const body = await request(`${BASE}/users/${userId}/mfa`, {
        method: 'PATCH',
        body: JSON.stringify({ mfaEnabled }),
      });
      return normalizeUser(body);
    },
    () => mockApi.toggleMfa(userId, mfaEnabled),
  );
}
