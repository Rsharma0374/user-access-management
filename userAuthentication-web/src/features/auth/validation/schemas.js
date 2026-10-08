/**
 * Zod validation schemas for all authentication forms.
 *
 * Constraints mirror the backend DTOs (RegisterRequest, LoginRequest, etc.)
 * so the client catches obvious errors before the round-trip.
 *
 * Note: Backend enforces additional policy (breached passwords, rate limits,
 * account status). These schemas only handle format/length/required.
 */

import { z } from 'zod';

// ─── Shared refinements ───────────────────────────────────────────────────────

const emailSchema = z
  .string()
  .min(1, 'Email is required.')
  .max(320, 'Email must be 320 characters or fewer.')
  .email('Enter a valid email address.');

const passwordSchema = z
  .string()
  .min(1, 'Password is required.')
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password must be 128 characters or fewer.');

// ─── Login ────────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, 'Password is required.')
    .max(256, 'Password must be 256 characters or fewer.'),
});

// ─── Register ─────────────────────────────────────────────────────────────────

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

// ─── Forgot password ──────────────────────────────────────────────────────────

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

// ─── Reset password ───────────────────────────────────────────────────────────

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your new password.'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

// ─── MFA code ─────────────────────────────────────────────────────────────────

export const mfaSchema = z.object({
  code: z
    .string()
    .min(1, 'Verification code is required.')
    .regex(/^\d{6}$/, 'Enter the 6-digit code from your authenticator app.'),
});

// ─── Resend verification ──────────────────────────────────────────────────────

export const resendVerificationSchema = z.object({
  email: emailSchema,
});
