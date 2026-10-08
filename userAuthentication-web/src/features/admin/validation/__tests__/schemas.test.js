import { describe, it, expect } from 'vitest';
import { createUserSchema } from '../schemas.js';

const valid = {
  fullName: 'Jane Doe',
  email: 'jane.doe@example.com',
  password: 'Str0ng!Pass',
  productName: 'super-admin',
  role: 'MEMBER',
  mfaEnabled: false,
};

describe('createUserSchema', () => {
  it('accepts a fully valid payload', () => {
    const result = createUserSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('requires a full name of at least 2 characters', () => {
    expect(createUserSchema.safeParse({ ...valid, fullName: '' }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...valid, fullName: 'A' }).success).toBe(false);
  });

  it('rejects an invalid email', () => {
    const r = createUserSchema.safeParse({ ...valid, email: 'not-an-email' });
    expect(r.success).toBe(false);
  });

  it('enforces password strength (upper, lower, number, symbol, length)', () => {
    expect(createUserSchema.safeParse({ ...valid, password: 'short' }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...valid, password: 'alllowercase1!' }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...valid, password: 'ALLUPPERCASE1!' }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...valid, password: 'NoNumber!!' }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...valid, password: 'NoSymbol123' }).success).toBe(false);
    expect(createUserSchema.safeParse({ ...valid, password: 'Str0ng!Pass' }).success).toBe(true);
  });

  it('requires a product selection', () => {
    const r = createUserSchema.safeParse({ ...valid, productName: '' });
    expect(r.success).toBe(false);
  });

  it('only allows known roles', () => {
    expect(createUserSchema.safeParse({ ...valid, role: 'ADMIN' }).success).toBe(true);
    expect(createUserSchema.safeParse({ ...valid, role: 'VIEWER' }).success).toBe(true);
    expect(createUserSchema.safeParse({ ...valid, role: 'SUPERUSER' }).success).toBe(false);
  });

  it('defaults mfaEnabled to false when omitted', () => {
    const { mfaEnabled, ...withoutMfa } = valid;
    const r = createUserSchema.safeParse(withoutMfa);
    expect(r.success).toBe(true);
    expect(r.data.mfaEnabled).toBe(false);
  });
});
