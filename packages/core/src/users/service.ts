import { NotFoundError, UnauthorizedError } from '../errors';
import { parseInput } from '../parse-input';
import * as repository from './repository';
import {
  type MemberProfile,
  type OnboardingProfile,
  type UserIdInput,
  userIdInput,
} from './schema';

export async function getOnboardingProfile(
  input: UserIdInput,
): Promise<OnboardingProfile | null> {
  const { userId } = parseInput(userIdInput, input);
  return repository.findOnboardingProfile(userId);
}

export async function getMemberProfile(
  input: UserIdInput,
): Promise<MemberProfile> {
  const { userId } = parseInput(userIdInput, input);
  const profile = await repository.findMemberProfile(userId);
  if (!profile) throw new NotFoundError('User not found');
  return profile;
}

export async function requireAdminActor(actorId: string): Promise<void> {
  const { userId } = parseInput(userIdInput, { userId: actorId });
  const user = await repository.findRole(userId);
  if (user?.role !== 'ADMIN')
    throw new UnauthorizedError('Admin role required');
}
