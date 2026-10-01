import {
  getLoginRedirectPath,
  getSafeRedirectPath,
  isAuthPath,
  isProtectedPath,
} from '@/lib/auth/authorization';
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

  it('builds a canonical login redirect for a protected request', () => {
    expect(getLoginRedirectPath('/home')).toBe('/login?callbackUrl=%2Fhome');
    expect(getLoginRedirectPath('/workouts?q=calm')).toBe(
      '/login?callbackUrl=%2Fworkouts%3Fq%3Dcalm',
    );
    expect(getLoginRedirectPath(undefined)).toBe('/login');
  });
});

describe('isAuthPath — guest-only route guard', () => {
  it.each(['/login', '/register', '/forgot-password', '/reset-password'])(
    'identifies %s as an auth-only path',
    (pathname) => {
      expect(isAuthPath(pathname)).toBe(true);
    },
  );

  it('identifies sub-paths of auth routes', () => {
    expect(isAuthPath('/reset-password/abc123')).toBe(true);
    expect(isAuthPath('/forgot-password/confirm')).toBe(true);
  });

  it.each(['/verify-email', '/home', '/profile', '/', '/api/auth/session'])(
    'does not classify %s as auth-only',
    (pathname) => {
      expect(isAuthPath(pathname)).toBe(false);
    },
  );
});
