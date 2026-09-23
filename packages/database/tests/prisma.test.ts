import { beforeEach, describe, expect, it, vi } from 'vitest';

const prismaClient = vi.hoisted(() => vi.fn(function PrismaClient() {}));

vi.mock('@prisma/client', () => ({ Prisma: {}, PrismaClient: prismaClient }));

describe('Prisma client factory', () => {
  beforeEach(() => {
    vi.resetModules();
    prismaClient.mockClear();
    delete (globalThis as { miniWorkoutPrisma?: unknown }).miniWorkoutPrisma;
  });

  it('creates one client and reuses it across module reloads outside production', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';
    try {
      const first = await import('../src/prisma');
      vi.resetModules();
      const second = await import('../src/prisma');
      expect(prismaClient).toHaveBeenCalledOnce();
      expect(second.prisma).toBe(first.prisma);
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
  });

  it('does not retain the client globally in production', async () => {
    const previousNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';
    try {
      vi.resetModules();
      delete (globalThis as { miniWorkoutPrisma?: unknown }).miniWorkoutPrisma;

      await import('../src/prisma');

      expect(
        (globalThis as { miniWorkoutPrisma?: unknown }).miniWorkoutPrisma,
      ).toBeUndefined();
    } finally {
      if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = previousNodeEnv;
    }
  });
});

describe('database health', () => {
  it('pings the database through the shared Prisma singleton', async () => {
    const queryRaw = vi.fn().mockResolvedValue([{ '?column?': 1 }]);
    vi.doMock('../src/prisma', () => ({ prisma: { $queryRaw: queryRaw } }));

    const { pingDatabase } = await import('../src/health');
    await pingDatabase();

    expect(queryRaw).toHaveBeenCalledOnce();
  });
});
