import { assertSafeLockToken } from './database-lock.ts';
import { createHash } from 'node:crypto';

const mutationUserDomain = 'example.test';

type MutationIdentityInput = {
  runToken: string;
  testId: string;
  parallelIndex: number;
  workerIndex: number;
  retry: number;
  repeatEachIndex: number;
  identity?: string;
};

function assertFixtureIndex(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0 || value > 99_999) {
    throw new Error('E2E mutation identity index is invalid');
  }
}

function runTokenKey(runToken: string): string {
  assertSafeLockToken(runToken);
  return createHash('sha256')
    .update(runToken.toLowerCase())
    .digest('hex')
    .slice(0, 16);
}

export function createMutationUserEmail(input: MutationIdentityInput): string {
  assertFixtureIndex(input.parallelIndex);
  assertFixtureIndex(input.workerIndex);
  assertFixtureIndex(input.retry);
  assertFixtureIndex(input.repeatEachIndex);
  const tokenKey = runTokenKey(input.runToken);
  const testHash = createHash('sha256')
    .update(`${input.testId}\0${input.identity ?? 'primary'}`)
    .digest('hex')
    .slice(0, 12);
  return `e2e-${tokenKey}-${testHash}-p${input.parallelIndex}-w${input.workerIndex}-r${input.retry}-e${input.repeatEachIndex}@${mutationUserDomain}`;
}

export function assertOwnedMutationUserEmail(
  email: string,
  runToken: string,
): void {
  const tokenKey = runTokenKey(runToken);
  const ownedPattern = new RegExp(
    `^e2e-${tokenKey}-[0-9a-f]{12}-p\\d{1,5}-w\\d{1,5}-r\\d{1,5}-e\\d{1,5}@example\\.test$`,
  );
  const localPart = email.split('@')[0] ?? '';
  if (
    localPart.length > 64 ||
    email.length > 254 ||
    !ownedPattern.test(email)
  ) {
    throw new Error('Mutation user email is not owned by this E2E run');
  }
}
