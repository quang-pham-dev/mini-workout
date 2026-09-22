import { createPrismaAuthRateLimitStore } from '../src/rate-limit-prisma';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@mini-workout/database', () => ({
  Prisma: {
    sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({
      strings,
      values,
    }),
  },
  prisma: {
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
  },
}));

describe('Prisma auth rate-limit store', () => {
  it('prunes on a bounded cadence and maps an atomic upsert result', async () => {
    const client = {
      $executeRaw: vi.fn().mockResolvedValue(0),
      $queryRaw: vi
        .fn()
        .mockResolvedValueOnce([{ count: 1 }])
        .mockResolvedValueOnce([]),
    };
    const store = createPrismaAuthRateLimitStore(client);
    const rule = { window: 60, max: 5 };

    await expect(store.consume('private-key', rule)).resolves.toEqual({
      allowed: true,
      retryAfter: null,
    });
    await expect(store.consume('private-key', rule)).resolves.toEqual({
      allowed: false,
      retryAfter: 60,
    });

    expect(client.$executeRaw).toHaveBeenCalledOnce();
    expect(client.$queryRaw).toHaveBeenCalledTimes(2);
  });
});
