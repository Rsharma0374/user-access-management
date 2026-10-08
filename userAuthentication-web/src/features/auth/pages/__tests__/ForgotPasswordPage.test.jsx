import { describe, it, expect, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { server } from '../../../../test/mswServer.js';
import { VITEST_BASE } from '../../../../test/handlers.js';
import { renderWithProviders } from '../../../../test/renderWithProviders.jsx';
import ForgotPasswordPage from '../ForgotPasswordPage.jsx';

const BASE = `${VITEST_BASE}/auth-service/v1/auth`;

beforeEach(() => {
  server.use(
    http.post(`${BASE}/refresh`, () =>
      HttpResponse.json({ message: 'no cookie' }, { status: 401 }),
    ),
  );
});

describe('ForgotPasswordPage', () => {
  it('renders the email field and submit button', () => {
    renderWithProviders(<ForgotPasswordPage />);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /send reset instructions/i })).toBeInTheDocument();
  });

  it('shows a link back to sign in', () => {
    renderWithProviders(<ForgotPasswordPage />);
    expect(screen.getByRole('link', { name: /back to sign in/i })).toHaveAttribute('href', '/login');
  });

  it('shows a validation error when submitted empty', async () => {
    renderWithProviders(<ForgotPasswordPage />);
    await userEvent.click(screen.getByRole('button', { name: /send reset instructions/i }));

    await waitFor(() => {
      expect(screen.getByText(/email is required/i)).toBeInTheDocument();
    });
  });

  it('shows the neutral confirmation page after submission (account exists)', async () => {
    renderWithProviders(<ForgotPasswordPage />);
    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send reset instructions/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
    // Message must NOT confirm or deny account existence
    expect(screen.getByText(/if an account exists/i)).toBeInTheDocument();
  });

  it('shows neutral confirmation even for a non-existent email', async () => {
    renderWithProviders(<ForgotPasswordPage />);
    await userEvent.type(
      screen.getByLabelText(/email address/i),
      'doesnotexist@example.com',
    );
    await userEvent.click(screen.getByRole('button', { name: /send reset instructions/i }));

    await waitFor(() => {
      expect(screen.getByText(/check your email/i)).toBeInTheDocument();
    });
  });

  it('shows an error on a 500 server error', async () => {
    server.use(
      http.post(`${BASE}/forgot-password`, () =>
        HttpResponse.json({ message: 'Service unavailable' }, { status: 503 }),
      ),
    );

    renderWithProviders(<ForgotPasswordPage />);
    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send reset instructions/i }));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/something went wrong/i);
    });
  });

  it('allows trying a different email after confirmation', async () => {
    renderWithProviders(<ForgotPasswordPage />);
    await userEvent.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await userEvent.click(screen.getByRole('button', { name: /send reset instructions/i }));

    await waitFor(() => screen.getByText(/check your email/i));

    await userEvent.click(screen.getByRole('button', { name: /try a different email/i }));

    await waitFor(() => {
      expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    });
  });
});
