import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link } from 'react-router-dom';
import AuthLayout from '../../../components/layout/AuthLayout.jsx';
import Input from '../../../components/ui/Input.jsx';
import PasswordInput from '../../../components/ui/PasswordInput.jsx';
import Button from '../../../components/ui/Button.jsx';
import Alert from '../../../components/ui/Alert.jsx';
import { register as apiRegister, resendVerification } from '../services/authService.js';
import { useFormError } from '../hooks/useFormError.js';
import { registerSchema, resendVerificationSchema } from '../validation/schemas.js';

// ─── Post-registration: resend verification sub-form ─────────────────────────

function ResendVerificationForm({ prefillEmail }) {
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(resendVerificationSchema),
    defaultValues: { email: prefillEmail ?? '' },
  });
  const { formError, setFormError, clearFormError } = useFormError();

  async function onSubmit({ email }) {
    clearFormError();
    try {
      await resendVerification({ email });
      setSent(true);
    } catch (err) {
      setFormError(err?.message ?? 'Could not resend. Please try again.');
    }
  }

  if (sent) {
    return (
      <Alert
        variant="success"
        message="If the account exists and is awaiting verification, a new email has been sent."
      />
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4 mt-4">
      {formError && <Alert variant="error" message={formError} />}
      <Input
        id="resend-email"
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
        variant="secondary"
        fullWidth
        loading={isSubmitting}
        loadingLabel="Sending…"
      >
        Resend verification email
      </Button>
    </form>
  );
}

// ─── Main register page ───────────────────────────────────────────────────────

export default function RegisterPage() {
  const [submitState, setSubmitState] = useState(null); // null | 'pending' | 'accepted'
  const [submittedEmail, setSubmittedEmail] = useState('');

  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(registerSchema) });

  const { formError, setFormError, clearFormError, applyServerErrors } = useFormError();

  async function onSubmit({ email, password }) {
    clearFormError();
    setSubmittedEmail(email);
    try {
      await apiRegister({ email, password });
      setSubmitState('accepted');
    } catch (err) {
      const handled = applyServerErrors(err, setError);
      if (!handled) {
        setFormError(err?.message ?? 'Registration failed. Please try again.');
      }
    }
  }

  // ── Success / pending-verification state ──────────────────────────────────
  if (submitState === 'accepted') {
    return (
      <AuthLayout>
        <div className="auth-card px-8 py-10 sm:px-10 animate-slide-up">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-success-50">
              <svg className="h-8 w-8 text-success-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
              </svg>
            </div>
            <h1 className="text-title font-bold text-neutral-900">Check your email</h1>
            <p className="mt-2 text-sm text-neutral-500 max-w-xs">
              We've sent a verification link to{' '}
              <strong className="text-neutral-700 break-all">{submittedEmail}</strong>.
              Click the link to activate your account.
            </p>
          </div>

          <Alert
            variant="info"
            message="The verification link expires in 24 hours. Didn't receive it? Check your spam folder first."
          />

          <div className="mt-6 border-t border-neutral-100 pt-5">
            <p className="text-sm font-medium text-neutral-600 mb-1">
              Didn't receive the email?
            </p>
            <ResendVerificationForm prefillEmail={submittedEmail} />
          </div>

          <p className="mt-6 text-center text-sm text-neutral-500">
            Already verified?{' '}
            <Link to="/login" className="font-medium text-brand-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </AuthLayout>
    );
  }

  // ── Registration form ─────────────────────────────────────────────────────
  return (
    <AuthLayout>
      <div className="auth-card px-8 py-10 sm:px-10 animate-slide-up">
        <div className="mb-8">
          <h1 className="text-title font-bold text-neutral-900">Create your account</h1>
          <p className="mt-1.5 text-sm text-neutral-500">
            Get started — it only takes a minute.
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

          <PasswordInput
            id="password"
            label="Password"
            autoComplete="new-password"
            required
            placeholder="At least 8 characters"
            hint="8–128 characters."
            error={errors.password?.message}
            {...register('password')}
          />

          <PasswordInput
            id="confirmPassword"
            label="Confirm password"
            autoComplete="new-password"
            required
            placeholder="Re-enter your password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword')}
          />

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={isSubmitting}
            loadingLabel="Creating account…"
          >
            Create account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-neutral-500">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-medium text-brand-600 hover:text-brand-800 hover:underline
                       focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded"
          >
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}
