import { Link, useLocation } from 'react-router-dom';
import Button from '../components/ui/Button.jsx';

export default function NotFoundPage() {
  const location = useLocation();

  return (
    <div className="auth-bg min-h-dvh flex flex-col items-center justify-center p-6 text-center">
      {/* Decorative SVG number */}
      <svg
        aria-hidden="true"
        viewBox="0 0 200 80"
        className="w-48 sm:w-60 mb-6 text-brand-200"
        fill="currentColor"
      >
        <text
          x="50%"
          y="70"
          dominantBaseline="auto"
          textAnchor="middle"
          fontSize="90"
          fontWeight="700"
          letterSpacing="-6"
          fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
        >
          404
        </text>
      </svg>

      <div className="max-w-sm space-y-3">
        <h1 className="text-2xl font-bold text-neutral-900 tracking-tight">
          Page not found
        </h1>
        <p className="text-neutral-500 text-sm leading-relaxed">
          The page at{' '}
          <code className="bg-neutral-100 px-1.5 py-0.5 rounded text-xs font-mono text-neutral-700 break-all">
            {location.pathname}
          </code>{' '}
          doesn't exist.
        </p>
      </div>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Link to="/dashboard">
          <Button variant="primary" size="md">
            Go to dashboard
          </Button>
        </Link>
        <Link to="/login">
          <Button variant="secondary" size="md">
            Sign in
          </Button>
        </Link>
      </div>
    </div>
  );
}
