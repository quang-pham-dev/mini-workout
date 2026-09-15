import * as repository from '../../src/coaches/repository';
import { listAdminCoaches } from '../../src/coaches/service';
import { UnauthorizedError } from '../../src/errors';
import * as users from '../../src/users/service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/coaches/repository');
vi.mock('../../src/users/service');
beforeEach(() => vi.resetAllMocks());

describe('admin coach list', () => {
  it('requires a current admin role', async () => {
    vi.mocked(users.requireAdminActor).mockRejectedValue(
      new UnauthorizedError(),
    );
    await expect(
      listAdminCoaches({ actorId: 'member-1' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    expect(repository.findAdminCoaches).not.toHaveBeenCalled();
  });

  it('returns a terminal page when no more coaches exist', async () => {
    vi.mocked(repository.findAdminCoaches).mockResolvedValue([
      { id: 'coach-1' },
    ] as never);
    await expect(
      listAdminCoaches({ actorId: 'admin-1', limit: 2 }),
    ).resolves.toEqual({
      items: [{ id: 'coach-1' }],
      nextCursor: null,
    });
    expect(repository.findAdminCoaches).toHaveBeenCalledWith({
      cursor: undefined,
      take: 3,
    });
  });
});
