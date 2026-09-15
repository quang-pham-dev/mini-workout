import * as repository from '../../src/coaches/repository';
import { prisma } from '@mini-workout/database';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@mini-workout/database', () => ({
  prisma: { coach: { findMany: vi.fn() } },
}));

describe('coach repository', () => {
  it('uses cursor pagination and only selects admin list fields', async () => {
    await repository.findAdminCoaches({ cursor: 'previous', take: 21 });
    expect(prisma.coach.findMany).toHaveBeenCalledWith({
      cursor: { id: 'previous' },
      skip: 1,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: 21,
      select: {
        id: true,
        name: true,
        slug: true,
        bio: true,
        updatedAt: true,
        _count: { select: { workouts: true } },
      },
    });
  });
});
