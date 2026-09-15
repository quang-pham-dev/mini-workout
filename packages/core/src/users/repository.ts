import { prisma } from '@mini-workout/database';

export function findRole(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
}

export function findOnboardingProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
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
}

export function findMemberProfile(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      interests: { include: { interest: true } },
      _count: { select: { likes: true, favorites: true } },
    },
  });
}
