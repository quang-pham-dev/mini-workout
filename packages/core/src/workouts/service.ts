import {
  type AdminPage,
  type AdminPageInput,
  adminPageInput,
  makeAdminPage,
} from '../admin-pagination';
import { NotFoundError } from '../errors';
import { parseInput } from '../parse-input';
import { requireAdminActor } from '../users/service';
import * as repository from './repository';
import {
  type RecommendationInput,
  type SetWorkoutLikeInput,
  type WorkoutDetailInput,
  type WorkoutInteractionInput,
  type WorkoutListInput,
  type WorkoutMetaInput,
  recommendationInput,
  setWorkoutLikeInput,
  workoutDetailInput,
  workoutInteractionInput,
  workoutListInput,
  workoutMetaInput,
} from './schema';

async function requirePublishedWorkout(workoutId: string) {
  const workout = await repository.findPublishedWorkoutById(workoutId);
  if (!workout) throw new NotFoundError('Workout not found');
  return workout;
}

export async function listAdminWorkouts(
  input: AdminPageInput,
): Promise<AdminPage<repository.AdminWorkoutRow>> {
  const { actorId, cursor, limit } = parseInput(adminPageInput, input);
  await requireAdminActor(actorId);
  const rows = await repository.findAdminWorkouts({ cursor, take: limit + 1 });
  return makeAdminPage(rows, limit);
}

export async function toggleWorkoutLike(input: WorkoutInteractionInput) {
  const { userId, workoutId } = parseInput(workoutInteractionInput, input);
  const workout = await requirePublishedWorkout(workoutId);
  const existing = await repository.findLike(userId, workoutId);

  if (existing) await repository.deleteLike(userId, workoutId);
  else await repository.createLike(userId, workoutId);

  return { workoutSlug: workout.slug, active: !existing };
}

export async function setWorkoutLike(input: SetWorkoutLikeInput) {
  const { userId, workoutId, liked } = parseInput(setWorkoutLikeInput, input);
  const workout = await requirePublishedWorkout(workoutId);

  if (liked) await repository.insertLikeIfAbsent(userId, workoutId);
  else await repository.deleteLikeIfPresent(userId, workoutId);

  return { workoutSlug: workout.slug, liked };
}

export async function toggleWorkoutFavorite(input: WorkoutInteractionInput) {
  const { userId, workoutId } = parseInput(workoutInteractionInput, input);
  const workout = await requirePublishedWorkout(workoutId);
  const existing = await repository.findFavorite(userId, workoutId);

  if (existing) await repository.deleteFavorite(userId, workoutId);
  else await repository.createFavorite(userId, workoutId);

  return { workoutSlug: workout.slug, active: !existing };
}

export async function getPublishedWorkoutDetail(
  input: WorkoutDetailInput,
): Promise<repository.WorkoutCard | null> {
  const { userId, slug } = parseInput(workoutDetailInput, input);
  return repository.findPublishedWorkoutDetail(slug, userId);
}

export async function getLatestWorkouts(
  input: WorkoutListInput,
): Promise<repository.WorkoutCard[]> {
  const { userId } = parseInput(workoutListInput, input);
  return repository.findLatest(userId);
}

export async function getSavedWorkouts(
  input: WorkoutListInput,
): Promise<repository.WorkoutCard[]> {
  const { userId } = parseInput(workoutListInput, input);
  return repository.findSaved(userId);
}

export async function getPublishedWorkoutMeta(
  input: WorkoutMetaInput,
): Promise<{ title: string; description: string } | null> {
  const { slug } = parseInput(workoutMetaInput, input);
  return repository.findPublishedMeta(slug);
}

export async function getRecommendedWorkouts(
  input: RecommendationInput,
): Promise<repository.WorkoutCard[]> {
  const { userId, experienceLevel, interestIds } = parseInput(
    recommendationInput,
    input,
  );
  const limit = 3;
  let recommended: repository.WorkoutCard[] = [];

  if (interestIds.length > 0) {
    recommended = await repository.findByInterest({
      userId,
      experienceLevel,
      interestIds,
    });
  }
  if (recommended.length < limit) {
    const additional = await repository.findByLevel({
      userId,
      experienceLevel,
      excludeIds: recommended.map((workout) => workout.id),
      take: limit - recommended.length,
    });
    recommended = [...recommended, ...additional];
  }
  if (recommended.length === 0) {
    return repository.findPopular(userId, limit);
  }
  return recommended;
}
