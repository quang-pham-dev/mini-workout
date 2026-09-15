import {
  adminCoachesQueryOptions,
  adminWorkoutsQueryOptions,
} from '@/features/admin/query-options';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const serverFunctions = vi.hoisted(() => ({
  getAdminCoaches: vi.fn(),
  getAdminWorkouts: vi.fn(),
}));

vi.mock('@/features/admin/server-functions', () => serverFunctions);

describe('admin query contracts', () => {
  beforeEach(() => vi.clearAllMocks());

  it('keys and calls the workout query by cursor', async () => {
    serverFunctions.getAdminWorkouts.mockResolvedValue({
      items: [],
      nextCursor: null,
    });
    const options = adminWorkoutsQueryOptions('workout-1');

    expect(options.queryKey).toEqual([
      'admin',
      'workouts',
      { cursor: 'workout-1' },
    ]);
    await options.queryFn?.({} as never);
    expect(serverFunctions.getAdminWorkouts).toHaveBeenCalledWith({
      data: { cursor: 'workout-1' },
    });
  });

  it('keys and calls the coach query without a cursor', async () => {
    serverFunctions.getAdminCoaches.mockResolvedValue({
      items: [],
      nextCursor: null,
    });
    const options = adminCoachesQueryOptions();

    expect(options.queryKey).toEqual([
      'admin',
      'coaches',
      { cursor: undefined },
    ]);
    await options.queryFn?.({} as never);
    expect(serverFunctions.getAdminCoaches).toHaveBeenCalledWith({
      data: { cursor: undefined },
    });
  });
});
