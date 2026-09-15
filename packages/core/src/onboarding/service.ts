import { NotFoundError, ValidationError } from '../errors';
import { parseInput } from '../parse-input';
import * as repository from './repository';
import {
  type CompleteRequiredInput,
  type FinishOptionalInput,
  type SaveExperienceInput,
  completeRequiredInput,
  finishOptionalInput,
  saveExperienceInput,
} from './schema';

export async function getInterests(): Promise<
  { id: string; name: string; slug: string }[]
> {
  return repository.listInterests();
}

export async function saveExperience(
  input: SaveExperienceInput,
): Promise<void> {
  const { userId, experienceLevel } = parseInput(saveExperienceInput, input);
  await repository.updateExperience(userId, experienceLevel);
}

export async function completeRequiredOnboarding(input: CompleteRequiredInput) {
  const parsed = parseInput(completeRequiredInput, input);
  const interestIds = [...new Set(parsed.interestIds)];
  const count = await repository.countInterests(interestIds);
  if (count !== interestIds.length) {
    throw new ValidationError({ interestIds }, 'Unknown interest');
  }
  await repository.completeRequiredSteps({
    userId: parsed.userId,
    experienceLevel: parsed.experienceLevel,
    interestIds,
  });
}

export async function finishOptionalOnboarding(input: FinishOptionalInput) {
  const parsed = parseInput(finishOptionalInput, input);
  const progress = await repository.findProgress(parsed.userId);
  if (!progress) throw new NotFoundError('User not found');

  const appendUnique = (steps: string[], step: string) =>
    steps.includes(step) ? steps : [...steps, step];
  await repository.finishOptionalStep(parsed.userId, {
    ...(parsed.weeklyGoalDays === undefined
      ? {}
      : { weeklyGoalDays: parsed.weeklyGoalDays }),
    completedSteps: parsed.skipped
      ? progress.completedSteps
      : appendUnique(progress.completedSteps, parsed.step),
    skippedSteps: parsed.skipped
      ? appendUnique(progress.skippedSteps, parsed.step)
      : progress.skippedSteps,
  });
}
