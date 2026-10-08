/**
 * Test helper that wraps components in the full provider tree.
 *
 * Usage:
 *   renderWithProviders(<LoginPage />, { route: '/login' })
 */

import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from '../features/auth/context/AuthContext.jsx';

export function renderWithProviders(
  ui,
  { route = '/', initialEntries, ...renderOptions } = {},
) {
  const entries = initialEntries ?? [route];

  function Wrapper({ children }) {
    return (
      <MemoryRouter initialEntries={entries}>
        <AuthProvider>{children}</AuthProvider>
      </MemoryRouter>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Render a component at a specific route path so React Router
 * params / search params are populated.
 *
 * Usage:
 *   renderAtRoute('/reset-password?token=abc', <ResetPasswordPage />)
 */
export function renderAtRoute(path, ui) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AuthProvider>
        <Routes>
          <Route path="*" element={ui} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}
