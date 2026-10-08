/**
 * Playwright E2E tests for the authentication flows.
 *
 * These tests require the Vite dev server to be running (handled automatically
 * by playwright.config.js webServer config). They do NOT require the Java
 * backend — they exercise the UI only and are primarily regression and
 * accessibility smoke tests.
 *
 * For integration tests against a real backend, set the backend URL in
 * .env.local and remove the mock-mode assumptions below.
 */

import { test, expect } from '@playwright/test';

// ── Login page ────────────────────────────────────────────────────────────────
test.describe('Login page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('displays the sign-in form', async ({ page }) => {
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('shows validation errors on empty submit', async ({ page }) => {
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/email is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  test('shows error for malformed email', async ({ page }) => {
    await page.getByLabel(/email address/i).fill('not-valid');
    await page.getByLabel(/^password$/i).fill('password');
    await page.getByRole('button', { name: /sign in/i }).click();
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });

  test('password visibility toggle works', async ({ page }) => {
    const passwordInput = page.getByLabel(/^password$/i);
    await expect(passwordInput).toHaveAttribute('type', 'password');

    await page.getByRole('button', { name: /show password/i }).click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    await page.getByRole('button', { name: /hide password/i }).click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('has link to register', async ({ page }) => {
    await expect(page.getByRole('link', { name: /create one/i })).toHaveAttribute(
      'href',
      '/register',
    );
  });

  test('has link to forgot password', async ({ page }) => {
    await expect(page.getByRole('link', { name: /forgot/i })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
  });

  test('is keyboard navigable', async ({ page }) => {
    // Tab through the form elements
    await page.keyboard.press('Tab');
    await expect(page.getByLabel(/email address/i)).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel(/^password$/i)).toBeFocused();
  });
});

// ── Register page ─────────────────────────────────────────────────────────────
test.describe('Register page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
  });

  test('displays all required fields', async ({ page }) => {
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByLabel(/^password$/i)).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('shows mismatch error when passwords differ', async ({ page }) => {
    await page.getByLabel(/email address/i).fill('new@example.com');
    await page.getByLabel(/^password$/i).fill('Password1!');
    await page.getByLabel(/confirm password/i).fill('Different1!');
    await page.getByRole('button', { name: /create account/i }).click();
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });

  test('has link to sign in', async ({ page }) => {
    await expect(page.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });
});

// ── Forgot password page ──────────────────────────────────────────────────────
test.describe('Forgot password page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/forgot-password');
  });

  test('displays the email field', async ({ page }) => {
    await expect(page.getByLabel(/email address/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send reset instructions/i })).toBeVisible();
  });

  test('shows validation error on empty submit', async ({ page }) => {
    await page.getByRole('button', { name: /send reset instructions/i }).click();
    await expect(page.getByText(/email is required/i)).toBeVisible();
  });

  test('has link back to sign in', async ({ page }) => {
    await expect(page.getByRole('link', { name: /back to sign in/i })).toHaveAttribute(
      'href',
      '/login',
    );
  });
});

// ── Reset password page ───────────────────────────────────────────────────────
test.describe('Reset password page', () => {
  test('shows invalid-link screen without a token', async ({ page }) => {
    await page.goto('/reset-password');
    await expect(page.getByText(/invalid reset link/i)).toBeVisible();
    await expect(
      page.getByRole('link', { name: /request new reset link/i }),
    ).toBeVisible();
  });

  test('shows invalid-link screen with a short token', async ({ page }) => {
    await page.goto('/reset-password?token=tooshort');
    await expect(page.getByText(/invalid reset link/i)).toBeVisible();
  });

  test('shows the reset form with a valid-length token', async ({ page }) => {
    await page.goto(`/reset-password?token=${'a'.repeat(32)}`);
    await expect(page.getByLabel(/^new password$/i)).toBeVisible();
    await expect(page.getByLabel(/confirm new password/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /reset password/i })).toBeVisible();
  });

  test('shows mismatch error when passwords differ', async ({ page }) => {
    await page.goto(`/reset-password?token=${'a'.repeat(32)}`);
    await page.getByLabel(/^new password$/i).fill('Password1!');
    await page.getByLabel(/confirm new password/i).fill('Different1!');
    await page.getByRole('button', { name: /reset password/i }).click();
    await expect(page.getByText(/passwords do not match/i)).toBeVisible();
  });
});

// ── 404 page ──────────────────────────────────────────────────────────────────
test.describe('404 page', () => {
  test('shows not-found heading for unknown routes', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByText(/page not found/i)).toBeVisible();
  });

  test('has links back to dashboard and login', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await expect(page.getByRole('link', { name: /go to dashboard/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /sign in/i })).toBeVisible();
  });
});

// ── Responsive layout ─────────────────────────────────────────────────────────
test.describe('Responsive layout', () => {
  test('branding panel is hidden on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/login');
    // The branding panel has aria-hidden="true" and is hidden via lg: breakpoint
    const brandPanel = page.locator('[aria-hidden="true"]').first();
    // On mobile, it should not be visible (display:none via tailwind)
    await expect(brandPanel).not.toBeVisible();
  });

  test('form is accessible on narrow mobile', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.goto('/login');
    // Form should still be reachable with no horizontal scroll
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1); // allow 1px rounding
  });
});
