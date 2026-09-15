import {
  requestFixtureRunToken,
  requestMutationUserClaim,
} from '../coordinator.setup.ts';
import { databaseBaseURL } from '../playwright.config.ts';
import { authContextOptions } from './auth-request.ts';
import { resolveDatabaseUrl } from './database-env.ts';
import {
  assertOwnedMutationUserEmail,
  createMutationUserEmail,
} from './mutation-user-identity.ts';
import { test as base, expect } from './test.ts';
import type { Browser, BrowserContext, Page, TestInfo } from '@playwright/test';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';

const requireFromDatabase = createRequire(
  new URL('../../packages/database/package.json', import.meta.url),
);

type DatabaseClient = {
  user: {
    deleteMany(args: { where: { email: string } }): Promise<{ count: number }>;
  };
  $disconnect(): Promise<void>;
};

export type MutationUserIdentity = {
  email: string;
  name: string;
  password: string;
};

export type MutationUserSession = MutationUserIdentity & {
  context: BrowserContext;
  page: Page;
};

type MutationUserFixture = MutationUserSession & {
  newSession(identity: string): Promise<MutationUserSession>;
};

export async function withMutationUserTeardown<T>(
  runToken: string,
  cleanup: (email: string) => void | Promise<void>,
  operation: (registry: { claim(email: string): void }) => T | Promise<T>,
): Promise<T> {
  const claimedEmails: string[] = [];
  let result: T | undefined;
  let operationError: unknown;
  try {
    result = await operation({
      claim(email) {
        assertOwnedMutationUserEmail(email, runToken);
        if (!claimedEmails.includes(email)) claimedEmails.push(email);
      },
    });
  } catch (error) {
    operationError = error;
  }

  const cleanupErrors: unknown[] = [];
  for (const email of claimedEmails.reverse()) {
    try {
      await cleanup(email);
    } catch (error) {
      cleanupErrors.push(error);
    }
  }

  const errors = [
    ...(operationError === undefined
      ? []
      : operationError instanceof AggregateError
        ? operationError.errors
        : [operationError]),
    ...cleanupErrors,
  ];
  if (errors.length > 1) {
    throw new AggregateError(errors, 'Mutation user lifecycle failed', {
      cause: errors[0],
    });
  }
  if (errors.length === 1) throw errors[0];
  return result as T;
}

export async function cleanupMutationUser(
  databaseUrl: string,
  email: string,
  runToken: string,
  createClient: (databaseUrl: string) => DatabaseClient = (datasourceUrl) => {
    const { PrismaClient } = requireFromDatabase('@prisma/client') as {
      PrismaClient: new (options: { datasourceUrl: string }) => DatabaseClient;
    };
    return new PrismaClient({ datasourceUrl });
  },
): Promise<void> {
  const validatedDatabaseUrl = resolveDatabaseUrl({
    DATABASE_URL: databaseUrl,
    E2E_DATABASE_URL: databaseUrl,
  });
  assertOwnedMutationUserEmail(email, runToken);
  const prisma = createClient(validatedDatabaseUrl);
  try {
    await prisma.user.deleteMany({ where: { email } });
  } finally {
    await prisma.$disconnect();
  }
}

function identityForTest(
  runToken: string,
  testInfo: Pick<
    TestInfo,
    'testId' | 'parallelIndex' | 'workerIndex' | 'retry' | 'repeatEachIndex'
  >,
  identity: string,
): MutationUserIdentity {
  const email = createMutationUserEmail({
    runToken,
    testId: testInfo.testId,
    parallelIndex: testInfo.parallelIndex,
    workerIndex: testInfo.workerIndex,
    retry: testInfo.retry,
    repeatEachIndex: testInfo.repeatEachIndex,
    identity,
  });
  const digest = createHash('sha256').update(email).digest('hex');
  return {
    email,
    name: `E2E ${identity.replaceAll(/[^a-z0-9]+/gi, ' ').trim()}`,
    password: `E2e!${digest.slice(0, 20)}`,
  };
}

type MutationUserFixtureOptions = {
  browser: Browser;
  use: (fixture: MutationUserFixture) => Promise<void>;
  testInfo: Pick<
    TestInfo,
    'testId' | 'parallelIndex' | 'workerIndex' | 'retry' | 'repeatEachIndex'
  >;
  requestRunToken?: () => Promise<string>;
  resolveDatabaseUrl?: () => string;
  cleanup?: (
    databaseUrl: string,
    email: string,
    runToken: string,
  ) => Promise<void>;
  claimMutationUser?: (runToken: string, email: string) => Promise<void>;
};

export async function runMutationUserFixture({
  browser,
  use,
  testInfo,
  requestRunToken = requestFixtureRunToken,
  resolveDatabaseUrl: resolveUrl = () => resolveDatabaseUrl(process.env),
  cleanup = cleanupMutationUser,
  claimMutationUser = requestMutationUserClaim,
}: MutationUserFixtureOptions): Promise<void> {
  const runToken = await requestRunToken();
  const databaseUrl = resolveUrl();
  const contexts: BrowserContext[] = [];

  await withMutationUserTeardown(
    runToken,
    (email) => cleanup(databaseUrl, email, runToken),
    async ({ claim }) => {
      async function newSession(identity: string) {
        const user = identityForTest(runToken, testInfo, identity);
        await claimMutationUser(runToken, user.email);
        claim(user.email);
        const context = await browser.newContext(
          authContextOptions(databaseBaseURL),
        );
        contexts.push(context);
        return { ...user, context, page: await context.newPage() };
      }

      let operationError: unknown;
      try {
        const primary = await newSession('primary');
        await use({ ...primary, newSession });
      } catch (error) {
        operationError = error;
      }
      const closeErrors: unknown[] = [];
      for (const context of contexts.reverse()) {
        try {
          await context.close();
        } catch (error) {
          closeErrors.push(error);
        }
      }
      const errors = [
        ...(operationError === undefined
          ? []
          : operationError instanceof AggregateError
            ? operationError.errors
            : [operationError]),
        ...closeErrors,
      ];
      if (errors.length > 1)
        throw new AggregateError(errors, 'Mutation user use and close failed', {
          cause: errors[0],
        });
      if (errors.length === 1) throw errors[0];
    },
  );
}

export const test = base.extend<{ mutationUser: MutationUserFixture }>({
  mutationUser: async ({ browser }, use, testInfo) =>
    runMutationUserFixture({ browser, use, testInfo }),
});

export { expect };
export { assertOwnedMutationUserEmail, createMutationUserEmail };
