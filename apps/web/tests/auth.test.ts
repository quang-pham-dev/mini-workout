import { getSafeRedirectPath, isProtectedPath } from '@/lib/auth/authorization';
import { loginSchema, registerSchema } from '@/lib/auth/validation';
import { describe, expect, it } from 'vitest';

describe('authentication validation', () => {
  it('normalizes valid registration input', () => {
    expect(
      registerSchema.parse({
        name: '  Quang Pham  ',
        email: '  QUANG@example.com ',
        password: 'correct horse battery staple',
        confirmPassword: 'correct horse battery staple',
      }),
    ).toEqual({
      name: 'Quang Pham',
      email: 'quang@example.com',
      password: 'correct horse battery staple',
      confirmPassword: 'correct horse battery staple',
    });
  });

  it('rejects mismatched passwords and weak credentials', () => {
    const result = registerSchema.safeParse({
      name: 'A',
      email: 'invalid',
      password: 'short',
      confirmPassword: 'different',
    });

    expect(result.success).toBe(false);
  });

  it('normalizes login input', () => {
    expect(
      loginSchema.parse({
        email: ' USER@example.com ',
        password: 'correct horse battery staple',
      }),
    ).toEqual({
      email: 'user@example.com',
      password: 'correct horse battery staple',
    });
  });
});

describe('authentication route boundaries', () => {
  it.each(['/home', '/favourites', '/profile', '/onboarding'])(
    'protects %s',
    (pathname) => {
      expect(isProtectedPath(pathname)).toBe(true);
    },
  );

  it.each(['/', '/login', '/register', '/api/health'])(
    'does not protect %s',
    (pathname) => {
      expect(isProtectedPath(pathname)).toBe(false);
    },
  );

  it('allows only local redirect paths', () => {
    expect(getSafeRedirectPath('/home')).toBe('/home');
    expect(getSafeRedirectPath('https://evil.example')).toBe('/home');
    expect(getSafeRedirectPath('//evil.example')).toBe('/home');
  });
});
