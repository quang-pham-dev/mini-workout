import {
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from '../../src/errors';
import * as repository from '../../src/users/repository';
import {
  getMemberProfile,
  getOnboardingProfile,
  requireAdminActor,
} from '../../src/users/service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/users/repository');
beforeEach(() => vi.resetAllMocks());

describe('user service', () => {
  it('loads onboarding state for a validated user id', async () => {
    await getOnboardingProfile({ userId: 'user-1' });
    expect(repository.findOnboardingProfile).toHaveBeenCalledWith('user-1');
  });

  it('loads a member profile for the same authenticated user', async () => {
    vi.mocked(repository.findMemberProfile).mockResolvedValue({
      id: 'user-1',
    } as never);
    await getMemberProfile({ userId: 'user-1' });
    expect(repository.findMemberProfile).toHaveBeenCalledWith('user-1');
  });

  it('reports missing members explicitly', async () => {
    vi.mocked(repository.findMemberProfile).mockResolvedValue(null);
    await expect(
      getMemberProfile({ userId: 'missing' }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('reports invalid input as a domain validation error', async () => {
    await expect(getOnboardingProfile({ userId: '' })).rejects.toBeInstanceOf(
      ValidationError,
    );
    expect(repository.findOnboardingProfile).not.toHaveBeenCalled();
  });

  it('requires the current database role before an admin read', async () => {
    vi.mocked(repository.findRole).mockResolvedValueOnce({ role: 'MEMBER' });
    await expect(requireAdminActor('user-1')).rejects.toBeInstanceOf(
      UnauthorizedError,
    );
    vi.mocked(repository.findRole).mockResolvedValueOnce({ role: 'ADMIN' });
    await expect(requireAdminActor('user-1')).resolves.toBeUndefined();
    expect(repository.findRole).toHaveBeenCalledWith('user-1');
  });
});
