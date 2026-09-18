import { beforeEach, describe, expect, it, vi } from 'vitest';

const betterAuthMock = vi.hoisted(() => vi.fn(() => ({ api: {} })));

vi.mock('@mini-workout/database', () => ({ prisma: {} }));
vi.mock('@better-auth/prisma-adapter', () => ({
  prismaAdapter: vi.fn(() => 'test-adapter'),
}));
vi.mock('better-auth', () => ({ betterAuth: betterAuthMock }));
vi.mock('better-auth/next-js', () => ({
  nextCookies: vi.fn(() => ({ id: 'next-cookies' })),
}));
vi.mock('better-auth/tanstack-start', () => ({
  tanstackStartCookies: vi.fn(() => ({ id: 'tanstack-cookies' })),
}));

describe('auth singleton factories', () => {
  beforeEach(() => {
    vi.resetModules();
    betterAuthMock.mockClear();
    delete (globalThis as { miniWorkoutWebAuth?: unknown }).miniWorkoutWebAuth;
    delete (globalThis as { miniWorkoutTanStackAuth?: unknown })
      .miniWorkoutTanStackAuth;
  });

  it('reuses the web auth instance across development module reloads', async () => {
    const first = await import('../src/index');
    vi.resetModules();
    const second = await import('../src/index');

    expect(betterAuthMock).toHaveBeenCalledOnce();
    expect(second.auth).toBe(first.auth);
  });

  it('reuses the TanStack auth instance across development module reloads', async () => {
    const first = await import('../src/tanstack-start');
    vi.resetModules();
    const second = await import('../src/tanstack-start');

    expect(betterAuthMock).toHaveBeenCalledOnce();
    expect(second.tanstackAuth).toBe(first.tanstackAuth);
  });

  it('keeps web and TanStack auth adapters isolated', async () => {
    const web = await import('../src/index');
    const tanstack = await import('../src/tanstack-start');

    expect(betterAuthMock).toHaveBeenCalledTimes(2);
    expect(web.auth).not.toBe(tanstack.tanstackAuth);
  });
});
