import * as repository from '../../src/onboarding/repository';
import { prisma } from '@mini-workout/database';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const transactionUserUpdate = vi.fn();
const transactionDeleteInterests = vi.fn();
const transactionCreateInterests = vi.fn();

vi.mock('@mini-workout/database', () => ({
  prisma: {
    interest: { findMany: vi.fn(), count: vi.fn() },
    user: { update: vi.fn(), findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.$transaction).mockImplementation((callback) =>
    callback({
      user: { update: transactionUserUpdate },
      userInterest: {
        deleteMany: transactionDeleteInterests,
        createMany: transactionCreateInterests,
      },
    } as never),
  );
});

describe('onboarding repository', () => {
  it('lists and counts only requested interests', async () => {
    await repository.listInterests();
    await repository.countInterests(['a', 'b']);
    expect(prisma.interest.findMany).toHaveBeenCalledWith({
      orderBy: { name: 'asc' },
      select: { id: true, name: true, slug: true },
    });
    expect(prisma.interest.count).toHaveBeenCalledWith({
      where: { id: { in: ['a', 'b'] } },
    });
  });

  it('moves an experience step to interests', async () => {
    await repository.updateExperience('user-1', 'BEGINNER');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        experienceLevel: 'BEGINNER',
        onboardingStatus: 'IN_PROGRESS',
        currentStep: 'INTERESTS',
        completedSteps: { push: 'EXPERIENCE_LEVEL' },
      },
    });
  });

  it('updates user and interests in one transaction', async () => {
    await repository.completeRequiredSteps({
      userId: 'user-1',
      experienceLevel: 'INTERMEDIATE',
      interestIds: ['a', 'b'],
    });
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(transactionUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        experienceLevel: 'INTERMEDIATE',
        onboardingStatus: 'REQUIRED_COMPLETED',
        currentStep: 'WEEKLY_SCHEDULE',
        completedSteps: ['EXPERIENCE_LEVEL', 'INTERESTS'],
      },
    });
    expect(transactionDeleteInterests).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
    });
    expect(transactionCreateInterests).toHaveBeenCalledWith({
      data: [
        { userId: 'user-1', interestId: 'a' },
        { userId: 'user-1', interestId: 'b' },
      ],
    });
  });

  it('loads and finishes optional progress for the same user', async () => {
    await repository.findProgress('user-1');
    await repository.finishOptionalStep('user-1', {
      weeklyGoalDays: 3,
      completedSteps: ['WEEKLY_SCHEDULE'],
      skippedSteps: [],
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      select: { completedSteps: true, skippedSteps: true },
    });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        weeklyGoalDays: 3,
        completedSteps: ['WEEKLY_SCHEDULE'],
        skippedSteps: [],
        onboardingStatus: 'COMPLETED',
        currentStep: 'DONE',
      },
    });
  });
});
