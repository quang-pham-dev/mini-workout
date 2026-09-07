import {
  cleanupMutationUser,
  createMutationUserEmail,
  runMutationUserFixture,
  withMutationUserTeardown,
} from './user.ts';
import type { Browser } from '@playwright/test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const runToken = '12345678-1234-4123-8123-123456789abc';
const databaseUrl = 'postgresql://localhost/mini_workout_test';

function testInfo(retry = 0, repeatEachIndex = 0) {
  return {
    testId: 'db/lifecycle.spec.ts:fixture contract',
    parallelIndex: 0,
    workerIndex: 0,
    retry,
    repeatEachIndex,
  };
}

test('fixture cleans its exact identity when context creation fails before use', async () => {
  const events: string[] = [];
  const failure = new Error('context creation failed');

  await assert.rejects(
    runMutationUserFixture({
      browser: {
        newContext: async () => {
          throw failure;
        },
      } as unknown as Browser,
      use: async () => {
        events.push('use');
      },
      testInfo: testInfo(),
      requestRunToken: async () => runToken,
      resolveDatabaseUrl: () => databaseUrl,
      claimMutationUser: async (_token, email) => {
        events.push(`claim:${email}`);
      },
      cleanup: async (_url, email) => {
        events.push(`cleanup:${email}`);
      },
    }),
    (error) => error === failure,
  );

  assert.equal(events.length, 2);
  assert.match(events[0]!, /^claim:e2e-/);
  assert.equal(events[1], `cleanup:${events[0]!.slice(6)}`);
});

test('coordinator claim completes before context creation or mutation', async () => {
  const events: string[] = [];

  await runMutationUserFixture({
    browser: {
      newContext: async () => {
        events.push('context');
        return {
          newPage: async () => ({}),
          close: async () => undefined,
        };
      },
    } as unknown as Browser,
    use: async () => {
      events.push('use');
    },
    testInfo: testInfo(),
    requestRunToken: async () => runToken,
    resolveDatabaseUrl: () => databaseUrl,
    claimMutationUser: async (_token, email) => {
      events.push(`claim:${email}`);
    },
    cleanup: async () => undefined,
  });

  assert.match(events[0]!, /^claim:e2e-/);
  assert.deepEqual(events.slice(1), ['context', 'use']);
});

test('rejected coordinator claim prevents context creation and local cleanup', async () => {
  const events: string[] = [];
  const failure = new Error('claim rejected');

  await assert.rejects(
    runMutationUserFixture({
      browser: {
        newContext: async () => {
          events.push('context');
          throw new Error('context must not be created');
        },
      } as unknown as Browser,
      use: async () => {
        events.push('use');
      },
      testInfo: testInfo(),
      requestRunToken: async () => runToken,
      resolveDatabaseUrl: () => databaseUrl,
      claimMutationUser: async () => {
        events.push('claim');
        throw failure;
      },
      cleanup: async () => {
        events.push('cleanup');
      },
    }),
    (error) => error === failure,
  );

  assert.deepEqual(events, ['claim']);
});

test('fixture closes its context and cleans its exact identity when page creation fails', async () => {
  const events: string[] = [];
  const failure = new Error('page creation failed');

  await assert.rejects(
    runMutationUserFixture({
      browser: {
        newContext: async () => ({
          newPage: async () => {
            throw failure;
          },
          close: async () => {
            events.push('close');
          },
        }),
      } as unknown as Browser,
      use: async () => {
        events.push('use');
      },
      testInfo: testInfo(),
      requestRunToken: async () => runToken,
      resolveDatabaseUrl: () => databaseUrl,
      claimMutationUser: async () => undefined,
      cleanup: async (_url, email) => {
        events.push(`cleanup:${email}`);
      },
    }),
    (error) => error === failure,
  );

  assert.equal(events[0], 'close');
  assert.match(events[1]!, /^cleanup:e2e-/);
});

test('fixture closes contexts and cleans exact identities after a test-body failure', async () => {
  const events: string[] = [];
  const failure = new Error('test body failed');

  await assert.rejects(
    runMutationUserFixture({
      browser: {
        newContext: async () => ({
          newPage: async () => ({ marker: 'page' }),
          close: async () => events.push('close'),
        }),
      } as unknown as Browser,
      use: async ({ email }) => {
        events.push(`use:${email}`);
        throw failure;
      },
      testInfo: testInfo(),
      requestRunToken: async () => runToken,
      resolveDatabaseUrl: () => databaseUrl,
      claimMutationUser: async () => undefined,
      cleanup: async (_url, email) => {
        events.push(`cleanup:${email}`);
      },
    }),
    (error) => error === failure,
  );

  assert.match(events[0]!, /^use:e2e-/);
  assert.equal(events[1], 'close');
  assert.equal(events[2], `cleanup:${events[0]!.slice(4)}`);
});

test('failed retry identity is cleaned before a fresh retry identity is used', async () => {
  const events: string[] = [];
  const runAttempt = (retry: number) =>
    runMutationUserFixture({
      browser: {
        newContext: async () => ({
          newPage: async () => ({}),
          close: async () => undefined,
        }),
      } as unknown as Browser,
      use: async ({ email }) => {
        events.push(`use:${retry}:${email}`);
        if (retry === 0) throw new Error('retryable failure');
      },
      testInfo: testInfo(retry),
      requestRunToken: async () => runToken,
      resolveDatabaseUrl: () => databaseUrl,
      claimMutationUser: async () => undefined,
      cleanup: async (_url, email) => {
        events.push(`cleanup:${retry}:${email}`);
      },
    });

  await assert.rejects(runAttempt(0), /retryable failure/);
  await runAttempt(1);

  const firstEmail = events[0]!.split(':').at(-1)!;
  const secondEmail = events[2]!.split(':').at(-1)!;
  assert.deepEqual(events, [
    `use:0:${firstEmail}`,
    `cleanup:0:${firstEmail}`,
    `use:1:${secondEmail}`,
    `cleanup:1:${secondEmail}`,
  ]);
  assert.notEqual(firstEmail, secondEmail);
});

test('collects operation, every context close, and every database cleanup failure', async () => {
  const operationError = new Error('operation failed');
  const primaryCloseError = new Error('primary close failed');
  const secondaryCloseError = new Error('secondary close failed');
  const secondaryCleanupError = new Error('secondary cleanup failed');
  const primaryCleanupError = new Error('primary cleanup failed');
  const closeErrors = [primaryCloseError, secondaryCloseError];
  const cleanupErrors = [secondaryCleanupError, primaryCleanupError];
  const events: string[] = [];
  let contextIndex = 0;
  let cleanupIndex = 0;

  await assert.rejects(
    runMutationUserFixture({
      browser: {
        newContext: async () => {
          const index = contextIndex++;
          return {
            newPage: async () => ({}),
            close: async () => {
              events.push(`close:${index}`);
              throw closeErrors[index];
            },
          };
        },
      } as unknown as Browser,
      use: async ({ newSession }) => {
        await newSession('secondary');
        throw operationError;
      },
      testInfo: testInfo(),
      requestRunToken: async () => runToken,
      resolveDatabaseUrl: () => databaseUrl,
      claimMutationUser: async () => undefined,
      cleanup: async () => {
        const index = cleanupIndex++;
        events.push(`cleanup:${index}`);
        throw cleanupErrors[index];
      },
    }),
    (error) =>
      error instanceof AggregateError &&
      error.cause === operationError &&
      JSON.stringify(error.errors.map(String)) ===
        JSON.stringify(
          [
            operationError,
            secondaryCloseError,
            primaryCloseError,
            secondaryCleanupError,
            primaryCleanupError,
          ].map(String),
        ),
  );
  assert.deepEqual(events, ['close:1', 'close:0', 'cleanup:0', 'cleanup:1']);
});

test('creates unique owned identities across tests, workers, retries, and repeats', () => {
  const base = {
    runToken,
    testId: 'db/auth.spec.ts:registration',
    parallelIndex: 0,
    workerIndex: 0,
    retry: 0,
    repeatEachIndex: 0,
  };
  const emails = new Set([
    createMutationUserEmail(base),
    createMutationUserEmail({ ...base, testId: 'db/auth.spec.ts:login' }),
    createMutationUserEmail({ ...base, parallelIndex: 1 }),
    createMutationUserEmail({ ...base, workerIndex: 1 }),
    createMutationUserEmail({ ...base, retry: 1 }),
    createMutationUserEmail({ ...base, repeatEachIndex: 1 }),
    createMutationUserEmail({ ...base, identity: 'second-user' }),
  ]);

  assert.equal(emails.size, 7);
  for (const email of emails) {
    assert.match(
      email,
      /^e2e-[0-9a-f]{16}-[0-9a-f]{12}-p\d{1,5}-w\d{1,5}-r\d{1,5}-e\d{1,5}@example\.test$/,
    );
    assert.ok(email.split('@')[0]!.length <= 64);
    assert.ok(email.length <= 254);
  }
});

test('cleans the exact claimed identity after success', async () => {
  const email = createMutationUserEmail({
    runToken,
    testId: 'success',
    parallelIndex: 0,
    workerIndex: 0,
    retry: 0,
    repeatEachIndex: 0,
  });
  const cleaned: string[] = [];

  const result = await withMutationUserTeardown(
    runToken,
    (ownedEmail) => {
      cleaned.push(ownedEmail);
    },
    async ({ claim }) => {
      claim(email);
      return 'complete';
    },
  );

  assert.equal(result, 'complete');
  assert.deepEqual(cleaned, [email]);
});

for (const phase of ['setup', 'test'] as const) {
  test(`cleans the exact claimed identity after ${phase} failure`, async () => {
    const email = createMutationUserEmail({
      runToken,
      testId: `${phase}-failure`,
      parallelIndex: 0,
      workerIndex: 0,
      retry: 0,
      repeatEachIndex: 0,
    });
    const cleaned: string[] = [];
    const failure = new Error(`${phase} failed`);

    await assert.rejects(
      withMutationUserTeardown(
        runToken,
        (ownedEmail) => {
          cleaned.push(ownedEmail);
        },
        async ({ claim }) => {
          claim(email);
          if (phase === 'test') await Promise.resolve();
          throw failure;
        },
      ),
      (error) => error === failure,
    );
    assert.deepEqual(cleaned, [email]);
  });
}

test('rejects non-owned identities without invoking cleanup', async () => {
  const cleaned: string[] = [];

  await assert.rejects(
    withMutationUserTeardown(
      runToken,
      (ownedEmail) => {
        cleaned.push(ownedEmail);
      },
      async ({ claim }) => claim('active-user@example.test'),
    ),
    /not owned by this E2E run/,
  );
  assert.deepEqual(cleaned, []);
});

test('reports both operation and cleanup failures', async () => {
  const email = createMutationUserEmail({
    runToken,
    testId: 'dual-failure',
    parallelIndex: 0,
    workerIndex: 0,
    retry: 0,
    repeatEachIndex: 0,
  });
  const operationError = new Error('operation failed');
  const cleanupError = new Error('cleanup failed');

  await assert.rejects(
    withMutationUserTeardown(
      runToken,
      () => {
        throw cleanupError;
      },
      ({ claim }) => {
        claim(email);
        throw operationError;
      },
    ),
    (error) =>
      error instanceof AggregateError &&
      error.cause === operationError &&
      error.errors[0] === operationError &&
      error.errors[1] === cleanupError,
  );
});

test('aggregates every mutation user cleanup failure in cleanup order', async () => {
  const first = createMutationUserEmail({
    runToken,
    testId: 'cleanup-first',
    parallelIndex: 0,
    workerIndex: 0,
    retry: 0,
    repeatEachIndex: 0,
  });
  const second = createMutationUserEmail({
    runToken,
    testId: 'cleanup-second',
    parallelIndex: 0,
    workerIndex: 0,
    retry: 0,
    repeatEachIndex: 0,
  });
  const secondError = new Error('second cleanup failed');
  const firstError = new Error('first cleanup failed');

  await assert.rejects(
    withMutationUserTeardown(
      runToken,
      (email) => {
        throw email === second ? secondError : firstError;
      },
      ({ claim }) => {
        claim(first);
        claim(second);
      },
    ),
    (error) =>
      error instanceof AggregateError &&
      error.cause === secondError &&
      error.errors[0] === secondError &&
      error.errors[1] === firstError,
  );
});

test('never converts cleanup into a broad domain match', async () => {
  const first = createMutationUserEmail({
    runToken,
    testId: 'first',
    parallelIndex: 0,
    workerIndex: 0,
    retry: 0,
    repeatEachIndex: 0,
  });
  const second = createMutationUserEmail({
    runToken,
    testId: 'second',
    parallelIndex: 0,
    workerIndex: 0,
    retry: 0,
    repeatEachIndex: 0,
  });
  const cleaned: string[] = [];

  await withMutationUserTeardown(
    runToken,
    (ownedEmail) => {
      cleaned.push(ownedEmail);
    },
    async ({ claim }) => {
      claim(first);
      claim(second);
    },
  );

  assert.deepEqual(cleaned, [second, first]);
  assert.ok(cleaned.every((email) => !email.includes('*')));
});

test('validates the database and deletes only the exact owned email', async () => {
  const email = createMutationUserEmail({
    runToken,
    testId: 'database-cleanup',
    parallelIndex: 0,
    workerIndex: 0,
    retry: 0,
    repeatEachIndex: 0,
  });
  const calls: unknown[] = [];

  await cleanupMutationUser(
    'postgresql://localhost/mini_workout_test',
    email,
    runToken,
    () => ({
      user: {
        deleteMany: async (args) => {
          calls.push(args);
          return { count: 1 };
        },
      },
      $disconnect: async () => {
        calls.push('disconnect');
      },
    }),
  );

  assert.deepEqual(calls, [{ where: { email } }, 'disconnect']);
});

test('rejects non-owned cleanup before creating a database client', async () => {
  let createdClient = false;

  await assert.rejects(
    cleanupMutationUser(
      'postgresql://localhost/mini_workout_test',
      'empty-user@example.test',
      runToken,
      () => {
        createdClient = true;
        throw new Error('must not create client');
      },
    ),
    /not owned by this E2E run/,
  );
  assert.equal(createdClient, false);
});

test('user deletion cascades auth sessions and workout interactions', () => {
  const schema = readFileSync(
    new URL('../../apps/web/prisma/schema.prisma', import.meta.url),
    'utf8',
  );

  for (const model of [
    'Session',
    'Account',
    'UserInterest',
    'WorkoutLike',
    'WorkoutFavorite',
  ]) {
    const block = schema.match(
      new RegExp(`model ${model} \\{([\\s\\S]*?)\\n\\}`),
    );
    assert.ok(block, `missing ${model} model`);
    assert.match(
      block[1]!,
      /user\s+User\s+@relation\([^\n]*onDelete: Cascade\)/,
    );
  }
});
