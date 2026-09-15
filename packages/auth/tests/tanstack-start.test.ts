import { SESSION_COOKIE_NAME } from '../src/constants';
import { tanstackAuthOptions } from '../src/tanstack-start';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@mini-workout/database', () => ({ prisma: {} }));
vi.mock('@better-auth/prisma-adapter', () => ({
  prismaAdapter: vi.fn(() => 'test-adapter'),
}));
vi.mock('better-auth', () => ({ betterAuth: vi.fn(() => ({ api: {} })) }));
vi.mock('better-auth/tanstack-start', () => ({
  tanstackStartCookies: vi.fn(() => ({ id: 'tanstack-start-cookies' })),
}));

describe('TanStack Start auth configuration', () => {
  it('preserves the shared secure session cookie contract', () => {
    expect(tanstackAuthOptions.advanced.cookies.session_token).toMatchObject({
      name: SESSION_COOKIE_NAME,
      attributes: {
        httpOnly: true,
        sameSite: 'lax',
        secure: true,
      },
    });
  });

  it('installs the framework cookie plugin last', () => {
    expect(tanstackAuthOptions.plugins.at(-1)).toEqual({
      id: 'tanstack-start-cookies',
    });
  });
});
