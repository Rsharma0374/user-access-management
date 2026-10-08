/**
 * Application router.
 *
 * Route guard strategy:
 *   - While session status is 'initializing', show a full-screen spinner so
 *     there is no flash of the login page before the cookie refresh completes.
 *   - <ProtectedRoute> redirects unauthenticated users to /login, preserving
 *     the intended destination in location.state.from.
 *   - <PublicOnlyRoute> redirects authenticated users away from auth pages to
 *     /dashboard.
 *   - Route guards NEVER enforce API security — they only improve UX.
 */

import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/context/AuthContext.jsx';
import Spinner from '../components/ui/Spinner.jsx';

// ─── Route guards ─────────────────────────────────────────────────────────────

function LoadingScreen() {
  return (
    <div
      className="auth-bg min-h-dvh flex items-center justify-center"
      aria-label="Loading session…"
      role="status"
    >
      <div className="flex flex-col items-center gap-4 text-brand-600">
        <div className="h-12 w-12 rounded-2xl bg-brand-600 flex items-center justify-center shadow-lg">
          <svg viewBox="0 0 24 24" className="h-7 w-7 text-white" fill="currentColor">
            <path d="M12 1L3 5.5v7c0 5.25 3.77 10.16 9 11.36 5.23-1.2 9-6.11 9-11.36v-7L12 1z" />
            <path
              d="M9 12.5l2 2 4-4"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>
        <Spinner size="md" label="Checking session…" className="text-brand-400" />
        <span className="text-xs text-neutral-400">Checking session…</span>
      </div>
    </div>
  );
}

/** Redirect to /login while unauthenticated; block until initialized. */
function ProtectedRoute() {
  const { isInitializing, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isInitializing) return <LoadingScreen />;
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  }
  return <Outlet />;
}

/** Redirect authenticated users away from public-only pages (login, register…). */
function PublicOnlyRoute({ redirectTo = '/dashboard' }) {
  const { isInitializing, isAuthenticated } = useAuth();

  if (isInitializing) return <LoadingScreen />;
  if (isAuthenticated) return <Navigate to={redirectTo} replace />;
  return <Outlet />;
}

// ─── Lazy page imports ────────────────────────────────────────────────────────
// All pages are imported statically to keep the bundle simple. If the app
// grows, switch to React.lazy + Suspense per-route.

import LoginPage         from '../features/auth/pages/LoginPage.jsx';
import RegisterPage      from '../features/auth/pages/RegisterPage.jsx';
import ForgotPasswordPage from '../features/auth/pages/ForgotPasswordPage.jsx';
import ResetPasswordPage  from '../features/auth/pages/ResetPasswordPage.jsx';
import AdminDashboardPage from '../features/admin/pages/AdminDashboardPage.jsx';
import { ProductProvider } from '../features/admin/context/ProductContext.jsx';
import NotFoundPage      from '../pages/NotFoundPage.jsx';

// ─── Router ───────────────────────────────────────────────────────────────────

export default function AppRouter() {
  return (
    <Routes>
      {/* Root redirect */}
      <Route index element={<RootRedirect />} />

      {/* Public-only routes (redirect authenticated users to dashboard) */}
      <Route element={<PublicOnlyRoute />}>
        <Route path="login"          element={<LoginPage />} />
        <Route path="register"       element={<RegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
        <Route path="reset-password"  element={<ResetPasswordPage />} />
      </Route>

      {/* Protected routes — ProductProvider scopes admin product context */}
      <Route element={<ProtectedRoute />}>
        <Route
          path="dashboard"
          element={
            <ProductProvider>
              <AdminDashboardPage />
            </ProductProvider>
          }
        />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

function RootRedirect() {
  const { isInitializing, isAuthenticated } = useAuth();
  if (isInitializing) return <LoadingScreen />;
  return <Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />;
}
