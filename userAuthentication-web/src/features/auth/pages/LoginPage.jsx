import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthLayout from '../../../components/layout/AuthLayout.jsx';
import Input from '../../../components/ui/Input.jsx';
import PasswordInput from '../../../components/ui/PasswordInput.jsx';
import Button from '../../../components/ui/Button.jsx';
import Alert from '../../../components/ui/Alert.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useFormError } from '../hooks/useFormError.js';
import { loginSchema, mfaSchema } from '../validation/schemas.js';

// ─── MFA step ─────────────────────────────────────────────────────────────────

function MfaStep({ onVerify, onBack }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(mfaSchema) });

  const { formError, setFormError, clearFormError } = useFormError();

  async function onSubmit({ code }) {
    clearFormError();
    try {
      await onVerify(code);
    } catch (err) {
      setFormError(err?.message ?? 'Verification failed. Please try again.');
    }
  }

  return (
    <div className="auth-card px-8 py-10 sm:px-10 animate-slide-up">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100">
          <svg className="h-7 w-7 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 1.5H8.25A2.25 2.25 0 0 0 6 3.75v16.5a2.25 2.25 0 0 0 2.25 2.25h7.5A2.25 2.25 0 0 0 18 20.25V3.75a2.25 2.25 0 0 0-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 8.25h3m-3 3h3m-3 3h3" />
          </svg>
        </div>
        <h1 className="text-title text-neutral-900 font-bold">Two-factor authentication</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Enter the 6-digit code from your authenticator app.
        </p>
      </div>

      {formError && <Alert variant="error" message={formError} className="mb-5" />}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
        <Input
          id="mfa-code"
          label="Verification code"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="000000"
          required
          error={errors.code?.message}
          {...register('code')}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isSubmitting}
          loadingLabel="Verifying…"
        >
          Verify
        </Button>
      </form>

      <button
        type="button"
        onClick={onBack}
        className="mt-5 w-full text-center text-sm text-neutral-500 hover:text-brand-600 transition-colors"
      >
        ← Back to sign in
      </button>
    </div>
  );
}

// ─── Login page ───────────────────────────────────────────────────────────────

export default function LoginPage() {
  const { signIn, completeMfa, mfaChallenge } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from ?? '/dashboard';

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(loginSchema) });

  const { formError, setFormError, clearFormError, applyServerErrors } = useFormError();

  async function onSubmit({ email, password }) {
    clearFormError();
    try {
      const result = await signIn({ email, password });
      if (!result.mfaRequired) {
        navigate(from, { replace: true });
      }
      // If MFA required, component re-renders to show MfaStep
    } catch (err) {
      const handled = applyServerErrors(err, setError);
      if (!handled) {
        setFormError(err?.message ?? 'Sign in failed. Please try again.');
      }
    }
  }

  async function handleMfaVerify(code) {
    await completeMfa({ code });
    navigate(from, { replace: true });
  }

  function handleMfaBack() {
    // Reset to login step by navigating away and back, or just show form again
    // Auth context still holds the challenge but we allow re-submit
    clearFormError();
  }

  // Show MFA step when challenge is active
  if (mfaChallenge) {
    return (
      <AuthLayout>
        <MfaStep onVerify={handleMfaVerify} onBack={handleMfaBack} />
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <div className="auth-card px-8 py-10 sm:px-10 animate-slide-up">
        {/* Heading */}
        <div className="mb-8">
          <h1 className="text-title font-bold text-neutral-900">Welcome back</h1>
          <p className="mt-1.5 text-sm text-neutral-500">
            Sign in to your account to continue.
          </p>
        </div>

        {/* Form-level error */}
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

          <PasswordInput
            id="password"
            label="Password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            error={errors.password?.message}
            {...register('password')}
          />

          {/* Forgot password link */}
          <div className="flex justify-end -mt-1">
            <Link
              to="/forgot-password"
              className="text-sm text-brand-600 hover:text-brand-800 hover:underline
                         focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
            >
              Forgot your password?
            </Link>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
            loadingLabel="Signing in…"
          >
            Sign in
          </Button>
        </form>

        {/* Register link */}
        <p className="mt-6 text-center text-sm text-neutral-500">
          Don't have an account?{' '}
          <Link
            to="/register"
            className="font-medium text-brand-600 hover:text-brand-800 hover:underline
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
          >
            Create one
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
