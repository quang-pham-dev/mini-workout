import { adminWorkoutsQueryOptions } from '@/features/admin/query-options';
import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getAdminWorkouts } = vi.hoisted(() => ({ getAdminWorkouts: vi.fn() }));
vi.mock('@/features/admin/server-functions', () => ({
  getAdminCoaches: vi.fn(),
  getAdminWorkouts,
}));

describe('admin Query SSR contract', () => {
  beforeEach(() => getAdminWorkouts.mockReset());

  it('reuses loader-prefetched data during initial hydration', async () => {
    getAdminWorkouts.mockResolvedValue({ items: [], nextCursor: null });
    const client = new QueryClient();
    const options = adminWorkoutsQueryOptions();
    await client.ensureQueryData(options);
    await client.fetchQuery(options);
    expect(getAdminWorkouts).toHaveBeenCalledTimes(1);
  });
});
