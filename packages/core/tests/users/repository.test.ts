import * as repository from '../../src/users/repository';
import { prisma } from '@mini-workout/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@mini-workout/database', () => ({
  prisma: { user: { findUnique: vi.fn() } },
}));
beforeEach(() => vi.clearAllMocks());

describe('user repository', () => {
  it('loads only onboarding fields for session guards', async () => {
    await repository.findOnboardingProfile('user-1');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: {
        onboardingStatus: true,
        currentStep: true,
        completedSteps: true,
        skippedSteps: true,
        experienceLevel: true,
        weeklyGoalDays: true,
        targetFocusNotes: true,
        interests: { select: { interestId: true } },
      },
    });
  });

  it('loads member interactions and interests for profile', async () => {
    await repository.findMemberProfile('user-1');
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      include: {
        interests: { include: { interest: true } },
        _count: { select: { likes: true, favorites: true } },
      },
    });
  });
});
