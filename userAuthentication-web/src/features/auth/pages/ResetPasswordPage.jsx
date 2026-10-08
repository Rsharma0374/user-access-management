/**
 * ResetPasswordPage
 *
 * The backend sends password-reset emails with a link in the format:
 *   <notification.base-url><password-reset-path>?token=<RAW_TOKEN>
 *
 * The dev config sets:
 *   base-url: "http://localhost:10009/api"
 *   password-reset-path: "/reset-password"
 *
 * So the link is: http://localhost:10009/api/reset-password?token=XXX
 *
 * When the frontend serves this application, the reset-password route is
 * /reset-password and the token is read from the `token` query parameter.
 *
 * Edge cases handled:
 *  - No token in URL → show error with link to request new reset
 *  - Token too short (< 32 chars) → invalid format
 *  - 401 from backend → expired or already-used token
 *  - Network / server errors → generic retry message
 *  - Success → confirmation with link to sign in
 */

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useSearchParams } from 'react-router-dom';
import AuthLayout from '../../../components/layout/AuthLayout.jsx';
import PasswordInput from '../../../components/ui/PasswordInput.jsx';
import Button from '../../../components/ui/Button.jsx';
import Alert from '../../../components/ui/Alert.jsx';
import { resetPassword } from '../services/authService.js';
import { useFormError } from '../hooks/useFormError.js';
import { resetPasswordSchema } from '../validation/schemas.js';

// ─── Token validation ─────────────────────────────────────────────────────────

function validateToken(token) {
  if (!token) return 'missing';
  if (token.length < 32) return 'invalid';
  return 'ok';
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const tokenStatus = validateToken(token);

  const [resetDone, setResetDone] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(resetPasswordSchema) });

  const { formError, setFormError, clearFormError } = useFormError();

  // ── Missing / malformed token ─────────────────────────────────────────────
  if (tokenStatus !== 'ok') {
    return (
      <AuthLayout>
        <div className="auth-card px-8 py-10 sm:px-10 animate-slide-up">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-error-50">
              <svg className="h-8 w-8 text-error-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>
            <h1 className="text-title font-bold text-neutral-900">Invalid reset link</h1>
            <p className="mt-2 text-sm text-neutral-500 max-w-xs leading-relaxed">
              This password reset link is missing or malformed. Reset links are
              single-use and expire after 15 minutes.
            </p>
          </div>

          <Alert
            variant="warning"
            message="Please request a new reset link. Make sure to click the link in the email rather than copying and pasting it."
          />

          <div className="mt-6 space-y-3">
            <Link to="/forgot-password">
              <Button variant="primary" size="lg" fullWidth>
                Request new reset link
              </Button>
            </Link>
            <p className="text-center text-sm text-neutral-500">
              <Link to="/login" className="font-medium text-brand-600 hover:underline">
                Back to sign in
              </Link>
            </p>
          </div>
        </div>
      </AuthLayout>
    );
  }

  // ── Success state ─────────────────────────────────────────────────────────
  if (resetDone) {
    return (
      <AuthLayout>
        <div className="auth-card px-8 py-10 sm:px-10 animate-slide-up">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-success-50">
              <svg className="h-8 w-8 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                />
              </svg>
            </div>
            <h1 className="text-title font-bold text-neutral-900">Password reset</h1>
            <p className="mt-2 text-sm text-neutral-500 max-w-xs leading-relaxed">
              Your password has been updated successfully. You can now sign in
              with your new password.
            </p>
          </div>

          <Link to="/login">
            <Button variant="primary" size="lg" fullWidth>
              Sign in
            </Button>
          </Link>
        </div>
      </AuthLayout>
    );
  }

  // ── Reset form ────────────────────────────────────────────────────────────
  async function onSubmit({ password }) {
    clearFormError();
    try {
      await resetPassword({ token, password });
      setResetDone(true);
    } catch (err) {
      if (err?.isUnauthorized) {
        setFormError(
          'This reset link has expired or has already been used. Please request a new one.',
        );
      } else if (err?.isNetworkError) {
        setFormError('Network error — check your connection and try again.');
      } else {
        setFormError(err?.message ?? 'Password reset failed. Please try again.');
      }
    }
  }

  return (
    <AuthLayout>
      <div className="auth-card px-8 py-10 sm:px-10 animate-slide-up">
        <div className="mb-8">
          <h1 className="text-title font-bold text-neutral-900">Set new password</h1>
          <p className="mt-1.5 text-sm text-neutral-500">
            Choose a strong password for your account.
          </p>
        </div>

        {formError && (
          <>
            <Alert variant="error" message={formError} className="mb-5" />
            {/* If expired/used, offer a direct path to request a new link */}
            {formError.includes('expired') && (
              <div className="mb-5">
                <Link to="/forgot-password">
                  <Button variant="secondary" size="sm" fullWidth>
                    Request a new reset link
                  </Button>
                </Link>
              </div>
            )}
          </>
        )}

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          <PasswordInput
            id="password"
            label="New password"
            autoComplete="new-password"
            required
            placeholder="At least 8 characters"
            hint="8–128 characters."
            error={errors.password?.message}
            {...register('password')}
          />

          <PasswordInput
            id="confirmPassword"
            label="Confirm new password"
            autoComplete="new-password"
            required
            placeholder="Re-enter your new password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
            loadingLabel="Resetting password…"
          >
            Reset password
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            ← Back to sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
