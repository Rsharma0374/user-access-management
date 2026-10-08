import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../features/auth/context/AuthContext.jsx';
import { ToastProvider } from '../components/ui/Toast.jsx';

/**
 * Wraps the application in all global providers.
 *
 * Order matters:
 *   BrowserRouter → must be outermost (router context needed by everything).
 *   AuthProvider  → depends on router for navigation after session expiry.
 *   ToastProvider → app-wide notifications; must wrap all pages.
 *
 * ProductProvider is intentionally NOT global — it is mounted only inside the
 * authenticated admin area (see router.jsx) because it fetches product data
 * that requires an active session.
 */
export default function Providers({ children }) {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          {children}
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
