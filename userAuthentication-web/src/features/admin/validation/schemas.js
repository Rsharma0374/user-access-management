/**
 * Zod validation schemas for admin forms.
 *
 * Client-side validation improves UX only; the backend remains the source of
 * truth for all policy (uniqueness, password strength, role authorisation).
 */

import { z } from 'zod';

export const ROLE_OPTIONS = [
  { value: 'ADMIN',  label: 'Admin' },
  { value: 'MEMBER', label: 'Member' },
  { value: 'VIEWER', label: 'Viewer' },
];

// Standard email format check.
const emailSchema = z
  .string()
  .min(1, 'Email is required.')
  .max(320, 'Email must be 320 characters or fewer.')
  .email('Enter a valid email address.');

// Password strength: min 8 chars, with upper, lower, digit, and symbol.
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters.')
  .max(128, 'Password must be 128 characters or fewer.')
  .regex(/[a-z]/, 'Include at least one lowercase letter.')
  .regex(/[A-Z]/, 'Include at least one uppercase letter.')
  .regex(/\d/,    'Include at least one number.')
  .regex(/[^A-Za-z0-9]/, 'Include at least one symbol.');

export const createUserSchema = z.object({
  fullName: z
    .string()
    .min(1, 'Full name is required.')
    .min(2, 'Full name must be at least 2 characters.')
    .max(120, 'Full name must be 120 characters or fewer.'),
  email: emailSchema,
  password: passwordSchema,
  productName: z
    .string()
    .min(1, 'Please select a product.'),
  role: z.enum(['ADMIN', 'MEMBER', 'VIEWER'], {
    errorMap: () => ({ message: 'Please select a role.' }),
  }),
  mfaEnabled: z.boolean().default(false),
});
