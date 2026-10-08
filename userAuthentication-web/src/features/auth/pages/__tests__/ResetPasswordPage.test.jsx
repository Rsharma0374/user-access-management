import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../../test/mswServer.js';
import { VITEST_BASE } from '../../../../test/handlers.js';
import { renderAtRoute } from '../../../../test/renderWithProviders.jsx';
import ResetPasswordPage from '../ResetPasswordPage.jsx';

const BASE = `${VITEST_BASE}/auth-service/v1/auth`;

const VALID_TOKEN = 'a'.repeat(32);
const EXPIRED_TOKEN = 'expired-reset-token-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';

beforeEach(() => {
  server.use(
    http.post(`${BASE}/refresh`, () =>
      HttpResponse.json({ message: 'no cookie' }, { status: 401 }),
    ),
  );
});

// Label text is "New password *" — use prefix match to avoid the asterisk.
function getNewPasswordInput() {
  return screen.getByLabelText(/^new password/i);
}

describe('ResetPasswordPage — missing token', () => {
  it('shows an invalid-link error when no token is in the URL', () => {
    renderAtRoute('/reset-password', <ResetPasswordPage />);
    expect(screen.getByText(/invalid reset link/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /request new reset link/i }),
    ).toHaveAttribute('href', '/forgot-password');
  });

  it('shows an invalid-link error when token is too short', () => {
    renderAtRoute('/reset-password?token=short', <ResetPasswordPage />);
    expect(screen.getByText(/invalid reset link/i)).toBeInTheDocument();
  });
});

describe('ResetPasswordPage — valid token', () => {
  it('renders password fields when token is present', () => {
    renderAtRoute(`/reset-password?token=${VALID_TOKEN}`, <ResetPasswordPage />);
    expect(getNewPasswordInput()).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm new password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
  });

  it('shows validation error when passwords do not match', async () => {
    renderAtRoute(`/reset-password?token=${VALID_TOKEN}`, <ResetPasswordPage />);
    await userEvent.type(getNewPasswordInput(), 'Password1!');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'Different1!');
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('shows validation error when password is too short', async () => {
    renderAtRoute(`/reset-password?token=${VALID_TOKEN}`, <ResetPasswordPage />);
    await userEvent.type(getNewPasswordInput(), 'short');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'short');
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    });
  });

  it('shows success confirmation after a valid reset', async () => {
    renderAtRoute(`/reset-password?token=${VALID_TOKEN}`, <ResetPasswordPage />);
    await userEvent.type(getNewPasswordInput(), 'NewPassword1!');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'NewPassword1!');
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByText(/password reset/i)).toBeInTheDocument();
    });
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows an expired-token error and link to request another reset', async () => {
    renderAtRoute(`/reset-password?token=${EXPIRED_TOKEN}`, <ResetPasswordPage />);
    await userEvent.type(getNewPasswordInput(), 'NewPassword1!');
    await userEvent.type(screen.getByLabelText(/confirm new password/i), 'NewPassword1!');
    await userEvent.click(screen.getByRole('button', { name: /reset password/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/expired or has already been used/i);
    });
    expect(
      screen.getByRole('link', { name: /request a new reset link/i }),
    ).toBeInTheDocument();
  });

  it('both password fields have show/hide toggles', () => {
    renderAtRoute(`/reset-password?token=${VALID_TOKEN}`, <ResetPasswordPage />);
    const toggles = screen.getAllByRole('button', { name: /show password/i });
    expect(toggles.length).toBeGreaterThanOrEqual(2);
  });

  it('shows back-to-sign-in link', () => {
    renderAtRoute(`/reset-password?token=${VALID_TOKEN}`, <ResetPasswordPage />);
    expect(screen.getByRole('link', { name: /back to sign in/i })).toHaveAttribute(
      'href',
      '/login',
    );
  });
});
