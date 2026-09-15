import { NotFoundError, ValidationError } from '../../src/errors';
import * as repository from '../../src/onboarding/repository';
import {
  completeRequiredOnboarding,
  finishOptionalOnboarding,
  getInterests,
  saveExperience,
} from '../../src/onboarding/service';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../src/onboarding/repository');

beforeEach(() => vi.resetAllMocks());

describe('onboarding service', () => {
  it('validates an experience step before persisting', async () => {
    await saveExperience({ userId: 'user-1', experienceLevel: 'BEGINNER' });
    expect(repository.updateExperience).toHaveBeenCalledWith(
      'user-1',
      'BEGINNER',
    );
    await expect(
      saveExperience({ userId: 'user-1', experienceLevel: 'EXPERT' as never }),
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it('rejects unknown interest ids before the required-step transaction', async () => {
    vi.mocked(repository.countInterests).mockResolvedValue(1);
    await expect(
      completeRequiredOnboarding({ userId: 'user-1', interestIds: ['a', 'b'] }),
    ).rejects.toBeInstanceOf(ValidationError);
    expect(repository.completeRequiredSteps).not.toHaveBeenCalled();
  });

  it('deduplicates interests and commits required steps atomically', async () => {
    vi.mocked(repository.countInterests).mockResolvedValue(2);
    await completeRequiredOnboarding({
      userId: 'user-1',
      experienceLevel: 'INTERMEDIATE',
      interestIds: ['a', 'a', 'b'],
    });
    expect(repository.completeRequiredSteps).toHaveBeenCalledWith({
      userId: 'user-1',
      experienceLevel: 'INTERMEDIATE',
      interestIds: ['a', 'b'],
    });
  });

  it('finishes an optional step without duplicating completed steps', async () => {
    vi.mocked(repository.findProgress).mockResolvedValue({
      completedSteps: ['WEEKLY_SCHEDULE'],
      skippedSteps: [],
    });
    await finishOptionalOnboarding({
      userId: 'user-1',
      step: 'WEEKLY_SCHEDULE',
      weeklyGoalDays: 3,
      skipped: false,
    });
    expect(repository.finishOptionalStep).toHaveBeenCalledWith('user-1', {
      weeklyGoalDays: 3,
      completedSteps: ['WEEKLY_SCHEDULE'],
      skippedSteps: [],
    });
  });

  it('rejects completion for a missing user', async () => {
    vi.mocked(repository.findProgress).mockResolvedValue(null);
    await expect(
      finishOptionalOnboarding({
        userId: 'missing',
        step: 'WEEKLY_SCHEDULE',
        skipped: true,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('lists interests through the repository', async () => {
    await getInterests();
    expect(repository.listInterests).toHaveBeenCalledOnce();
  });
});
