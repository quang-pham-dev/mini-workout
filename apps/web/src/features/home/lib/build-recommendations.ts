import {
  findPopularWorkouts,
  findWorkoutsByInterest,
  findWorkoutsByLevel,
} from '../queries';
import type { WorkoutType } from '@/types/workout';
import { ExperienceLevel } from '@prisma/client';

type BuildRecommendationsParams = {
  userId: string;
  experienceLevel: ExperienceLevel;
  interestIds: string[];
};

const RECOMMENDATION_COUNT = 3;

export async function buildRecommendations({
  userId,
  experienceLevel,
  interestIds,
}: BuildRecommendationsParams): Promise<WorkoutType[]> {
  let recommended: WorkoutType[] = [];

  if (experienceLevel && interestIds.length > 0) {
    recommended = await findWorkoutsByInterest({
      userId,
      experienceLevel,
      interestIds,
    });
  }

  if (experienceLevel && recommended.length < RECOMMENDATION_COUNT) {
    const additional = await findWorkoutsByLevel({
      userId,
      experienceLevel,
      excludeIds: recommended.map((w) => w.id),
      take: RECOMMENDATION_COUNT - recommended.length,
    });
    recommended = [...recommended, ...additional];
  }

  if (recommended.length === 0) {
    recommended = await findPopularWorkouts(userId, RECOMMENDATION_COUNT);
  }

  return recommended;
}
