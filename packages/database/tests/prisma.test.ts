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
    const first = await import('../src/prisma');
    vi.resetModules();
    const second = await import('../src/prisma');
    expect(prismaClient).toHaveBeenCalledOnce();
    expect(second.prisma).toBe(first.prisma);
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
