import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../../test/mswServer.js';
import { VITEST_BASE } from '../../../../test/handlers.js';
import { renderWithProviders } from '../../../../test/renderWithProviders.jsx';
import RegisterPage from '../RegisterPage.jsx';

const BASE = `${VITEST_BASE}/auth-service/v1/auth`;

beforeEach(() => {
  server.use(
    http.post(`${BASE}/refresh`, () =>
      HttpResponse.json({ message: 'no cookie' }, { status: 401 }),
    ),
  );
});

// Label text is "Password *" (required indicator appended in the label).
// Use prefix match /^password/i to match reliably.
async function fillForm({ email, password, confirm }) {
  await userEvent.type(screen.getByLabelText(/email address/i), email);
  await userEvent.type(screen.getByLabelText(/^password/i), password);
  await userEvent.type(screen.getByLabelText(/confirm password/i), confirm);
}

describe('RegisterPage', () => {
  it('renders all required fields', () => {
    renderWithProviders(<RegisterPage />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument();
  });

  it('shows a link to sign in', () => {
    renderWithProviders(<RegisterPage />);
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute('href', '/login');
  });

  it('shows validation errors on empty submit', async () => {
    renderWithProviders(<RegisterPage />);
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
      expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    });
  });

  it('shows error when passwords do not match', async () => {
    renderWithProviders(<RegisterPage />);
    await fillForm({
      email: 'test@example.com',
      password: 'Password1!',
      confirm: 'DifferentPassword!',
    });
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('shows the email-verification confirmation after successful registration', async () => {
    renderWithProviders(<RegisterPage />);
    await fillForm({
      email: 'newuser@example.com',
      password: 'Password1!',
      confirm: 'Password1!',
    });
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/newuser@example.com/i)).toBeInTheDocument();
  });

  it('shows a conflict error for an already-registered email', async () => {
    renderWithProviders(<RegisterPage />);
    await fillForm({
      email: 'existing@example.com',
      password: 'Password1!',
      confirm: 'Password1!',
    });
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/already exists/i);
    });
  });

  it('shows password strength hint text', () => {
    renderWithProviders(<RegisterPage />);
    expect(screen.getByText(/8–128 characters/i)).toBeInTheDocument();
  });

  it('both password fields have show/hide toggles', () => {
    renderWithProviders(<RegisterPage />);
    const toggles = screen.getAllByRole('button', { name: /show password/i });
    expect(toggles.length).toBeGreaterThanOrEqual(2);
  });

  it('shows resend form after reaching the confirmation screen', async () => {
    renderWithProviders(<RegisterPage />);
    await fillForm({
      email: 'newuser2@example.com',
      password: 'Password1!',
      confirm: 'Password1!',
    });
    await userEvent.click(screen.getByRole('button', { name: /create account/i }));

    await waitFor(() => screen.getByText(/check your email/i));

    expect(
      screen.getByRole('button', { name: /resend verification email/i }),
    ).toBeInTheDocument();
  });
});
