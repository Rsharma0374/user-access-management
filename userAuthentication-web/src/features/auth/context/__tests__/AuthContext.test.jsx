import { describe, it, expect } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import React from 'react';
import { server } from '../../../../test/mswServer.js';
import { VITEST_BASE } from '../../../../test/handlers.js';
import { renderWithProviders } from '../../../../test/renderWithProviders.jsx';
import { useAuth } from '../AuthContext.jsx';

const BASE = `${VITEST_BASE}/auth-service/v1/auth`;

// Small consumer component for testing context values
function AuthStatus() {
  const { status, sessionId, isAuthenticated, isInitializing } = useAuth();
  return (
    <div>
      <span data-testid="status">{status}</span>
      <span data-testid="session">{sessionId ?? 'none'}</span>
      <span data-testid="authed">{String(isAuthenticated)}</span>
      <span data-testid="init">{String(isInitializing)}</span>
    </div>
  );
}

function SignInButton() {
  const { signIn } = useAuth();
  const [error, setError] = React.useState('');
  return (
    <>
      <button
        onClick={() =>
          signIn({ email: 'user@example.com', password: 'Password1!' }).catch((e) =>
            setError(e.message),
          )
        }
      >
        Sign in
      </button>
      {error && <span data-testid="error">{error}</span>}
    </>
  );
}

function SignOutButton() {
  const { signOut } = useAuth();
  return <button onClick={signOut}>Sign out</button>;
}

describe('AuthContext', () => {
  it('starts in initializing state', () => {
    renderWithProviders(<AuthStatus />);
    expect(screen.getByTestId('init')).toHaveTextContent('true');
    expect(screen.getByTestId('status')).toHaveTextContent('initializing');
  });

  it('transitions to unauthenticated when refresh fails', async () => {
    // Default handler returns 401 for /refresh
    renderWithProviders(<AuthStatus />);
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
    });
    expect(screen.getByTestId('authed')).toHaveTextContent('false');
  });

  it('transitions to authenticated when refresh succeeds', async () => {
    server.use(
      http.post(`${BASE}/refresh`, () =>
        HttpResponse.json({ accessToken: 'restored-token', sessionId: 'restored-session' }),
      ),
    );
    renderWithProviders(<AuthStatus />);
    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });
    expect(screen.getByTestId('authed')).toHaveTextContent('true');
  });

  it('signIn() sets authenticated status on SUCCESS', async () => {
    renderWithProviders(
      <>
        <AuthStatus />
        <SignInButton />
      </>,
    );

    // Wait for initializing to finish
    await waitFor(() => expect(screen.getByTestId('init')).toHaveTextContent('false'));

    await userEvent.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated');
    });
    expect(screen.getByTestId('session')).toHaveTextContent('session-uuid-123');
  });

  it('signIn() propagates ApiError on bad credentials', async () => {
    server.use(
      http.post(`${BASE}/login`, () =>
        HttpResponse.json({ message: 'Invalid credentials' }, { status: 401 }),
      ),
    );

    function BadSignIn() {
      const { signIn } = useAuth();
      const [error, setError] = React.useState('');
      return (
        <>
          <button
            onClick={() =>
              signIn({ email: 'bad@example.com', password: 'wrong' }).catch((e) =>
                setError(e.message),
              )
            }
          >
            Sign in bad
          </button>
          {error && <span data-testid="error">{error}</span>}
        </>
      );
    }

    renderWithProviders(<BadSignIn />);
    await waitFor(() => expect(screen.queryByTestId('init')).toBeFalsy() || true);

    await userEvent.click(screen.getByRole('button', { name: /sign in bad/i }));

    await waitFor(() => {
      expect(screen.getByTestId('error')).toBeInTheDocument();
    });
  });

  it('signOut() transitions back to unauthenticated', async () => {
    // Make refresh succeed so we start authenticated
    server.use(
      http.post(`${BASE}/refresh`, () =>
        HttpResponse.json({ accessToken: 'tok', sessionId: 'sess' }),
      ),
    );

    renderWithProviders(
      <>
        <AuthStatus />
        <SignOutButton />
      </>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    );

    await userEvent.click(screen.getByRole('button', { name: /sign out/i }));

    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'),
    );
  });
});
