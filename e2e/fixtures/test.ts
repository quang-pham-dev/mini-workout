import { requestFixtureRunToken } from '../coordinator.setup.ts';
import { resolveDatabaseUrl } from './database-env.ts';
import { assertSafeLockToken, databaseRunKey } from './database-lock.ts';
import {
  type Browser,
  type Page,
  test as base,
  expect,
} from '@playwright/test';
import { fileURLToPath } from 'node:url';

type Fixtures = {
  activePage: Page;
  emptyPage: Page;
  newUserPage: Page;
};

async function pageWithStorageState(
  browser: Browser,
  state: string,
  use: (page: Page) => Promise<void>,
) {
  const context = await browser.newContext({ storageState: state });
  try {
    await use(await context.newPage());
  } finally {
    await context.close();
  }
}

export function authStatePath(
  name: string,
  databaseUrl: string,
  token?: string,
): string {
  assertSafeLockToken(token);
  if (!['active', 'empty', 'new-user'].includes(name))
    throw new Error('Invalid auth state name');
  return fileURLToPath(
    new URL(
      `../.auth/${databaseRunKey(databaseUrl)}/${token}/${name}.json`,
      import.meta.url,
    ),
  );
}

async function authState(name: string): Promise<string> {
  return authStatePath(
    name,
    resolveDatabaseUrl(process.env),
    await requestFixtureRunToken(),
  );
}

export const test = base.extend<Fixtures>({
  activePage: async ({ browser }, use) =>
    pageWithStorageState(browser, await authState('active'), use),
  emptyPage: async ({ browser }, use) =>
    pageWithStorageState(browser, await authState('empty'), use),
  newUserPage: async ({ browser }, use) =>
    pageWithStorageState(browser, await authState('new-user'), use),
});

export { expect };
