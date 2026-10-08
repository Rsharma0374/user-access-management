import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  mfaSchema,
} from '../schemas.js';

// ── loginSchema ───────────────────────────────────────────────────────────────
describe('loginSchema', () => {
  it('accepts valid credentials', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: 'Secret123' });
    expect(result.success).toBe(true);
  });

  it('rejects missing email', () => {
    const result = loginSchema.safeParse({ email: '', password: 'Secret123' });
    expect(result.success).toBe(false);
    expect(result.error.flatten().fieldErrors.email).toBeDefined();
  });

  it('rejects malformed email', () => {
    const result = loginSchema.safeParse({ email: 'not-an-email', password: 'Secret123' });
    expect(result.success).toBe(false);
    expect(result.error.flatten().fieldErrors.email).toBeDefined();
  });

  it('rejects missing password', () => {
    const result = loginSchema.safeParse({ email: 'user@example.com', password: '' });
    expect(result.success).toBe(false);
    expect(result.error.flatten().fieldErrors.password).toBeDefined();
  });

  it('rejects password over 256 chars', () => {
    const result = loginSchema.safeParse({
      email: 'user@example.com',
      password: 'a'.repeat(257),
    });
    expect(result.success).toBe(false);
  });
});

// ── registerSchema ────────────────────────────────────────────────────────────
describe('registerSchema', () => {
  const valid = {
    email: 'new@example.com',
    password: 'SecurePass1!',
    confirmPassword: 'SecurePass1!',
  };

  it('accepts valid registration data', () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects password shorter than 8 characters', () => {
    const result = registerSchema.safeParse({ ...valid, password: 'short', confirmPassword: 'short' });
    expect(result.success).toBe(false);
    expect(result.error.flatten().fieldErrors.password).toBeDefined();
  });

  it('rejects password longer than 128 characters', () => {
    const long = 'a'.repeat(129);
    const result = registerSchema.safeParse({ ...valid, password: long, confirmPassword: long });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched confirmPassword', () => {
    const result = registerSchema.safeParse({ ...valid, confirmPassword: 'DifferentPass1!' });
    expect(result.success).toBe(false);
    expect(result.error.flatten().fieldErrors.confirmPassword).toBeDefined();
  });

  it('rejects missing email', () => {
    const result = registerSchema.safeParse({ ...valid, email: '' });
    expect(result.success).toBe(false);
  });
});

// ── forgotPasswordSchema ──────────────────────────────────────────────────────
describe('forgotPasswordSchema', () => {
  it('accepts a valid email', () => {
    expect(forgotPasswordSchema.safeParse({ email: 'reset@example.com' }).success).toBe(true);
  });

  it('rejects an empty email', () => {
    const result = forgotPasswordSchema.safeParse({ email: '' });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed email', () => {
    const result = forgotPasswordSchema.safeParse({ email: 'not@@valid' });
    expect(result.success).toBe(false);
  });
});

// ── resetPasswordSchema ───────────────────────────────────────────────────────
describe('resetPasswordSchema', () => {
  const valid = { password: 'NewPass123!', confirmPassword: 'NewPass123!' };

  it('accepts matching passwords', () => {
    expect(resetPasswordSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects password shorter than 8 characters', () => {
    const result = resetPasswordSchema.safeParse({ password: 'short', confirmPassword: 'short' });
    expect(result.success).toBe(false);
  });

  it('rejects mismatched confirmPassword', () => {
    const result = resetPasswordSchema.safeParse({ ...valid, confirmPassword: 'wrong' });
    expect(result.success).toBe(false);
    expect(result.error.flatten().fieldErrors.confirmPassword).toBeDefined();
  });
});

// ── mfaSchema ─────────────────────────────────────────────────────────────────
describe('mfaSchema', () => {
  it('accepts a 6-digit code', () => {
    expect(mfaSchema.safeParse({ code: '123456' }).success).toBe(true);
  });

  it('rejects fewer than 6 digits', () => {
    expect(mfaSchema.safeParse({ code: '12345' }).success).toBe(false);
  });

  it('rejects more than 6 digits', () => {
    expect(mfaSchema.safeParse({ code: '1234567' }).success).toBe(false);
  });

  it('rejects non-numeric characters', () => {
    expect(mfaSchema.safeParse({ code: 'abcdef' }).success).toBe(false);
  });

  it('rejects empty string', () => {
    expect(mfaSchema.safeParse({ code: '' }).success).toBe(false);
  });
});
