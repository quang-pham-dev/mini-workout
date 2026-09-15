import { SESSION_COOKIE_NAME } from '../src/constants';
import { authOptions } from '../src/index';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@mini-workout/database', () => ({ prisma: {} }));
vi.mock('@better-auth/prisma-adapter', () => ({
  prismaAdapter: vi.fn(() => 'test-adapter'),
}));
vi.mock('better-auth', () => ({ betterAuth: vi.fn(() => ({ api: {} })) }));
vi.mock('better-auth/next-js', () => ({
  nextCookies: vi.fn(() => ({ id: 'next-cookies' })),
}));

describe('shared auth configuration', () => {
  it('preserves the existing session cookie contract', () => {
    expect(authOptions.advanced.cookies.session_token.name).toBe(
      SESSION_COOKIE_NAME,
    );
    expect(authOptions.advanced.cookies.session_token.attributes).toMatchObject(
      {
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
      },
    );
  });

  it('never lets a sign-up request choose a role', () => {
    expect(authOptions.user.additionalFields.role).toMatchObject({
      input: false,
      defaultValue: 'MEMBER',
    });
  });
});
