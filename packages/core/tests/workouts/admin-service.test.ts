import { UnauthorizedError, ValidationError } from '../../src/errors';
import * as users from '../../src/users/service';
import * as repository from '../../src/workouts/repository';
import { listAdminWorkouts } from '../../src/workouts/service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/workouts/repository');
vi.mock('../../src/users/service');
beforeEach(() => vi.resetAllMocks());

describe('admin workout list', () => {
  it('rejects invalid paging before reading data', async () => {
    await expect(
      listAdminWorkouts({ actorId: 'admin-1', limit: 0 }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repository.findAdminWorkouts).not.toHaveBeenCalled();
  });

  it('does not read data for a non-admin actor', async () => {
    vi.mocked(users.requireAdminActor).mockRejectedValue(
      new UnauthorizedError(),
    );
    await expect(
      listAdminWorkouts({ actorId: 'member-1' }),
    ).rejects.toBeInstanceOf(UnauthorizedError);
    expect(repository.findAdminWorkouts).not.toHaveBeenCalled();
  });

  it('returns a bounded page with a cursor when more drafts or published rows exist', async () => {
    vi.mocked(repository.findAdminWorkouts).mockResolvedValue([
      { id: 'a', isPublished: false },
      { id: 'b', isPublished: true },
      { id: 'c', isPublished: false },
    ] as never);
    await expect(
      listAdminWorkouts({ actorId: 'admin-1', cursor: 'previous', limit: 2 }),
    ).resolves.toEqual({
      items: [
        { id: 'a', isPublished: false },
        { id: 'b', isPublished: true },
      ],
      nextCursor: 'b',
    });
    expect(repository.findAdminWorkouts).toHaveBeenCalledWith({
      cursor: 'previous',
      take: 3,
    });
  });
});
