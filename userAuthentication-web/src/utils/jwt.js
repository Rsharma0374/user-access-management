/**
 * Lightweight JWT utilities.
 *
 * We only ever need to READ claims from a JWT the backend issued to us.
 * We never verify the signature client-side — that is entirely the backend's
 * responsibility. This module just base64-decodes the payload section.
 */

/**
 * Decode a JWT and return its payload as a plain object.
 * Returns null if the token is missing, malformed, or not parseable.
 *
 * @param {string|null} token
 * @returns {Record<string, unknown>|null}
 */
export function decodeJwt(token) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    // Base64-URL → Base64 → JSON
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded  = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
    const json    = atob(padded);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Extract the roles array from a decoded JWT payload.
 * The backend stores roles under the "roles" claim as string[].
 *
 * @param {Record<string, unknown>|null} claims
 * @returns {string[]}
 */
export function getRoles(claims) {
  if (!claims) return [];
  const roles = claims.roles;
  if (!Array.isArray(roles)) return [];
  return roles.map(String);
}

/**
 * Return true if the decoded payload indicates super-admin access.
 * The backend sets productName === 'super-admin' AND/OR includes
 * 'SUPER_ADMIN' in the roles array.
 *
 * @param {Record<string, unknown>|null} claims
 * @returns {boolean}
 */
export function isSuperAdminClaims(claims) {
  if (!claims) return false;
  const isProductSuperAdmin = claims.productName === 'super-admin';
  const hasRole = getRoles(claims).some(
    (r) => r === 'SUPER_ADMIN' || r === 'super_admin',
  );
  return isProductSuperAdmin || hasRole;
}

/**
 * Return the subject (user ID UUID) from claims.
 * @param {Record<string, unknown>|null} claims
 * @returns {string|null}
 */
export function getSubject(claims) {
  return (claims?.sub ?? null);
}

/**
 * Return the email from claims (stored as 'email' or 'sub' depending on
 * backend config). Returns null if not present.
 *
 * @param {Record<string, unknown>|null} claims
 * @returns {string|null}
 */
export function getEmail(claims) {
  return (claims?.email ?? null);
}

/**
 * Check whether the JWT has expired client-side.
 * Note: The backend always re-validates — this is a UX shortcut only.
 *
 * @param {Record<string, unknown>|null} claims
 * @returns {boolean}
 */
export function isExpired(claims) {
  if (!claims?.exp) return false;
  return Date.now() / 1000 > Number(claims.exp);
}
