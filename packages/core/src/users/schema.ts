import type {
  ExperienceLevel,
  OnboardingStatus,
  OnboardingStep,
} from '@mini-workout/database';
import { z } from 'zod';

export const userIdInput = z.object({ userId: z.string().min(1).max(128) });
export type UserIdInput = z.infer<typeof userIdInput>;

export type OnboardingProfile = {
  onboardingStatus: OnboardingStatus;
  currentStep: OnboardingStep;
  completedSteps: string[];
  skippedSteps: string[];
  experienceLevel: ExperienceLevel | null;
  weeklyGoalDays: number | null;
  targetFocusNotes: string | null;
  interests: { interestId: string }[];
};

export type MemberProfile = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  onboardingStatus: OnboardingStatus;
  currentStep: OnboardingStep;
  experienceLevel: ExperienceLevel | null;
  weeklyGoalDays: number | null;
  interests: {
    interest: { id: string; name: string; slug: string; createdAt: Date };
  }[];
  _count: { likes: number; favorites: number };
};
