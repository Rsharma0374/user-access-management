import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import AuthLayout from '../../../components/layout/AuthLayout.jsx';
import Input from '../../../components/ui/Input.jsx';
import Button from '../../../components/ui/Button.jsx';
import Alert from '../../../components/ui/Alert.jsx';
import { forgotPassword } from '../services/authService.js';
import { useFormError } from '../hooks/useFormError.js';
import { forgotPasswordSchema } from '../validation/schemas.js';

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(forgotPasswordSchema) });

  const { formError, setFormError, clearFormError } = useFormError();

  async function onSubmit({ email }) {
    clearFormError();
    try {
      await forgotPassword({ email });
      // Always show the same confirmation regardless of whether the account exists.
      // The backend also returns the same neutral response.
      setSubmitted(true);
    } catch (err) {
      // Even on a real server error we show the neutral confirmation to avoid
      // leaking account existence through error vs success branching.
      if (err?.status >= 500 || err?.isNetworkError) {
        setFormError('Something went wrong. Please try again shortly.');
      } else {
        // 4xx — treat as neutral (account enumeration protection)
        setSubmitted(true);
      }
    }
  }

  // ── Confirmation state ────────────────────────────────────────────────────
  if (submitted) {
    return (
      <AuthLayout>
        <div className="auth-card px-8 py-10 sm:px-10 animate-slide-up">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-success-50">
              <svg className="h-8 w-8 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75"
                />
              </svg>
            </div>
            <h1 className="text-title font-bold text-neutral-900">Check your email</h1>
            <p className="mt-2 text-sm text-neutral-500 max-w-xs leading-relaxed">
              If an account exists for that email address, you'll receive password
              reset instructions shortly.
            </p>
          </div>

          <Alert
            variant="info"
            message="The reset link is valid for 15 minutes. Check your spam folder if it doesn't arrive."
          />

          <p className="mt-8 text-center text-sm text-neutral-500">
            Remember your password?{' '}
            <Link to="/login" className="font-medium text-brand-600 hover:underline">
              Sign in
            </Link>
          </p>

          <p className="mt-3 text-center text-sm text-neutral-500">
            <button
              type="button"
              onClick={() => setSubmitted(false)}
              className="font-medium text-neutral-600 hover:text-brand-600 hover:underline"
            >
              Try a different email
            </button>
          </p>
        </div>
      </AuthLayout>
    );
  }

  // ── Request form ──────────────────────────────────────────────────────────
  return (
    <AuthLayout>
      <div className="auth-card px-8 py-10 sm:px-10 animate-slide-up">
        <div className="mb-8">
          <h1 className="text-title font-bold text-neutral-900">Forgot your password?</h1>
          <p className="mt-1.5 text-sm text-neutral-500 leading-relaxed">
            Enter your email address and we'll send you a link to reset it, if
            an account exists.
          </p>
        </div>

        {formError && (
          <Alert variant="error" message={formError} className="mb-5" />
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <Input
            id="email"
            label="Email address"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
            error={errors.email?.message}
            {...register('email')}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
            loadingLabel="Sending instructions…"
          >
            Send reset instructions
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          <Link
            to="/login"
            className="font-medium text-brand-600 hover:text-brand-800 hover:underline
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
          >
            ← Back to sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
