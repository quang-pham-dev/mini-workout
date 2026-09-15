import {
  loadAdminCoachesPage,
  loadAdminWorkoutsPage,
} from '@/features/admin/load-page';
import { describe, expect, it, vi } from 'vitest';

describe('admin server data boundary', () => {
  it('passes only actor and cursor to the workout service and serializes dates', async () => {
    const list = vi.fn().mockResolvedValue({
      items: [
        {
          id: 'workout-1',
          title: 'Core',
          slug: 'core',
          durationMinutes: 20,
          level: 'BEGINNER',
          isPublished: true,
          updatedAt: new Date('2026-09-15T00:00:00.000Z'),
          coach: { name: 'Coach' },
          category: { name: 'Strength' },
        },
      ],
      nextCursor: null,
    });

    const result = await loadAdminWorkoutsPage(
      { userId: 'admin-1', cursor: 'cursor-1' },
      list,
    );
    expect(list).toHaveBeenCalledWith({
      actorId: 'admin-1',
      cursor: 'cursor-1',
    });
    expect(result.items[0]?.updatedAt).toBe('2026-09-15T00:00:00.000Z');
  });

  it('passes only actor and cursor to the coach service and serializes dates', async () => {
    const list = vi.fn().mockResolvedValue({
      items: [
        {
          id: 'coach-1',
          name: 'Coach',
          slug: 'coach',
          bio: 'Bio',
          updatedAt: new Date('2026-09-15T00:00:00.000Z'),
          _count: { workouts: 2 },
        },
      ],
      nextCursor: null,
    });
    const result = await loadAdminCoachesPage(
      { userId: 'admin-1', cursor: undefined },
      list,
    );
    expect(list).toHaveBeenCalledWith({
      actorId: 'admin-1',
      cursor: undefined,
    });
    expect(result.items[0]?.updatedAt).toBe('2026-09-15T00:00:00.000Z');
  });
});
