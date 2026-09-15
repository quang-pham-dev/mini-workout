import { type ExperienceLevel, prisma } from '@mini-workout/database';

export function listInterests() {
  return prisma.interest.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true },
  });
}

export function countInterests(interestIds: string[]) {
  return prisma.interest.count({ where: { id: { in: interestIds } } });
}

export function updateExperience(
  userId: string,
  experienceLevel: ExperienceLevel,
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      experienceLevel,
      onboardingStatus: 'IN_PROGRESS',
      currentStep: 'INTERESTS',
      completedSteps: { push: 'EXPERIENCE_LEVEL' },
    },
  });
}

export function completeRequiredSteps(input: {
  userId: string;
  experienceLevel?: ExperienceLevel;
  interestIds: string[];
}) {
  return prisma.$transaction(async (transaction) => {
    await transaction.user.update({
      where: { id: input.userId },
      data: {
        ...(input.experienceLevel
          ? { experienceLevel: input.experienceLevel }
          : {}),
        onboardingStatus: 'REQUIRED_COMPLETED',
        currentStep: 'WEEKLY_SCHEDULE',
        completedSteps: ['EXPERIENCE_LEVEL', 'INTERESTS'],
      },
    });
    await transaction.userInterest.deleteMany({
      where: { userId: input.userId },
    });
    await transaction.userInterest.createMany({
      data: input.interestIds.map((interestId) => ({
        userId: input.userId,
        interestId,
      })),
    });
  });
}

export function findProgress(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { completedSteps: true, skippedSteps: true },
  });
}

export function finishOptionalStep(
  userId: string,
  data: {
    weeklyGoalDays?: number;
    completedSteps: string[];
    skippedSteps: string[];
  },
) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      ...data,
      onboardingStatus: 'COMPLETED',
      currentStep: 'DONE',
    },
  });
}
