import {
  requestFixtureRunToken,
  requestMutationUserClaim,
} from '../../coordinator.setup.ts';
import { acquireDatabaseLock, isDatabaseLockOwner } from '../database-lock.ts';
import { createMutationUserEmail, withMutationUserTeardown } from '../user.ts';
import { expect, test } from '@playwright/test';
import { writeFileSync } from 'node:fs';

test('a separate consumer obtains ownership only from the coordinator endpoint', async () => {
  expect(process.env.E2E_RUN_TOKEN).toBeUndefined();
  const token = await requestFixtureRunToken();
  const email = createMutationUserEmail({
    runToken: token,
    testId: 'orchestration-consumer',
    parallelIndex: 0,
    workerIndex: 0,
    retry: 0,
    repeatEachIndex: 0,
  });
  await requestMutationUserClaim(token, email);
  writeFileSync(`${process.env.CONTRACT_ROOT}/claim-stages`, 'claim\n');
  writeFileSync(
    `${process.env.CONTRACT_ROOT}/consumer`,
    JSON.stringify({ pid: process.pid, token, email }),
  );
  expect(
    isDatabaseLockOwner(
      process.env.DATABASE_URL!,
      token,
      process.env.CONTRACT_ROOT,
    ),
  ).toBe(true);
  expect(() =>
    acquireDatabaseLock(process.env.DATABASE_URL!, process.env.CONTRACT_ROOT),
  ).toThrow(/already in use/);
  if (process.env.CONTRACT_SETUP_FAIL === 'local-cleanup') {
    await withMutationUserTeardown(
      token,
      () => {
        throw new Error('original local cleanup failure');
      },
      ({ claim }) => {
        claim(email);
        writeFileSync(
          `${process.env.CONTRACT_ROOT}/claim-stages`,
          'claim\noperation\n',
        );
        throw new Error('original operation failure');
      },
    );
  }
  if (process.env.CONTRACT_SETUP_FAIL === 'interrupt-consumer') {
    test.setTimeout(0);
    writeFileSync(`${process.env.CONTRACT_ROOT}/ready`, 'consumer');
    await new Promise<void>(() => {});
  }
});
