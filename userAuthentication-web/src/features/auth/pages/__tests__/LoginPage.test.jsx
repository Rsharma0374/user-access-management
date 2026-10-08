import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../../test/mswServer.js';
import { VITEST_BASE } from '../../../../test/handlers.js';
import { renderWithProviders } from '../../../../test/renderWithProviders.jsx';
import LoginPage from '../LoginPage.jsx';

const BASE = `${VITEST_BASE}/auth-service/v1/auth`;

// Suppress the startup refresh call so every test begins unauthenticated
beforeEach(() => {
  server.use(
    http.post(`${BASE}/refresh`, () =>
      HttpResponse.json({ message: 'no cookie' }, { status: 401 }),
    ),
  );
});

// The Input component renders: <label>Password<span aria-hidden>*</span></label>
// RTL's getByLabelText computes the accessible name as "Password *".
// Using /^password/i (prefix match) handles that reliably.
function getPasswordInput() {
  return screen.getByLabelText(/^password/i);
}

async function fillAndSubmit(email, password) {
  await userEvent.type(screen.getByLabelText(/email address/i), email);
  await userEvent.type(getPasswordInput(), password);
  await userEvent.click(screen.getByRole('button', { name: /sign in/i }));
}

describe('LoginPage', () => {
  it('renders email, password fields and a sign-in button', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(getPasswordInput()).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  it('shows links to register and forgot-password', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByRole('link', { name: /create one/i })).toHaveAttribute('href', '/register');
    expect(screen.getByRole('link', { name: /forgot/i })).toHaveAttribute('href', '/forgot-password');
  });

  it('shows validation errors when submitted empty', async () => {
    renderWithProviders(<LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('shows validation error for malformed email', async () => {
    renderWithProviders(<LoginPage />);
    await userEvent.type(screen.getByLabelText(/email address/i), 'not-an-email');
    await userEvent.type(getPasswordInput(), 'pass');
    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByText(/valid email/i)).toBeInTheDocument();
    });
  });

  it('shows server error message on 401', async () => {
    renderWithProviders(<LoginPage />);
    await waitFor(() =>
      expect(screen.queryByText(/checking session/i)).not.toBeInTheDocument(),
    );

    await fillAndSubmit('bad@example.com', 'wrongpassword');

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid credentials/i);
    });
  });

  it('shows MFA step after MFA_REQUIRED response', async () => {
    renderWithProviders(<LoginPage />);
    await waitFor(() =>
      expect(screen.queryByText(/checking session/i)).not.toBeInTheDocument(),
    );

    await fillAndSubmit('mfa@example.com', 'Password1!');

    await waitFor(() => {
      expect(screen.getByText(/two-factor authentication/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/verification code/i)).toBeInTheDocument();
    });
  });

  it('shows MFA validation error for non-6-digit code', async () => {
    renderWithProviders(<LoginPage />);
    await waitFor(() =>
      expect(screen.queryByText(/checking session/i)).not.toBeInTheDocument(),
    );

    await fillAndSubmit('mfa@example.com', 'Password1!');
    await waitFor(() => screen.getByLabelText(/verification code/i));

    await userEvent.type(screen.getByLabelText(/verification code/i), '123');
    await userEvent.click(screen.getByRole('button', { name: /verify/i }));

    await waitFor(() => {
      // The error element has role="alert" — target it specifically
      expect(screen.getByRole('alert')).toHaveTextContent(/6-digit code/i);
    });
  });

  it('password field has password visibility toggle', () => {
    renderWithProviders(<LoginPage />);
    expect(screen.getByRole('button', { name: /show password/i })).toBeInTheDocument();
  });

  it('toggle changes input type from password to text', async () => {
    renderWithProviders(<LoginPage />);
    const passwordInput = getPasswordInput();
    expect(passwordInput).toHaveAttribute('type', 'password');

    await userEvent.click(screen.getByRole('button', { name: /show password/i }));
    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('disables submit button while loading', async () => {
    server.use(
      http.post(`${BASE}/login`, async () => {
        await new Promise((r) => setTimeout(r, 100));
        return HttpResponse.json({
          type: 'SUCCESS',
          accessToken: 'tok',
          sessionId: 's1',
          message: 'ok',
        });
      }),
    );

    renderWithProviders(<LoginPage />);
    await waitFor(() =>
      expect(screen.queryByText(/checking session/i)).not.toBeInTheDocument(),
    );

    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await userEvent.type(getPasswordInput(), 'Password1!');

    const button = screen.getByRole('button', { name: /sign in/i });
    await userEvent.click(button);

    await waitFor(() => {
      expect(button).toHaveAttribute('aria-busy', 'true');
    });
  });
});
