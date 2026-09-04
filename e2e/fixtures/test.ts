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
  longPage: Page;
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

function authState(name: string): string {
  return fileURLToPath(new URL(`../.auth/${name}.json`, import.meta.url));
}

export const test = base.extend<Fixtures>({
  activePage: async ({ browser }, use) =>
    pageWithStorageState(browser, authState('active'), use),
  emptyPage: async ({ browser }, use) =>
    pageWithStorageState(browser, authState('empty'), use),
  longPage: async ({ browser }, use) =>
    pageWithStorageState(browser, authState('long'), use),
  newUserPage: async ({ browser }, use) =>
    pageWithStorageState(browser, authState('new-user'), use),
});

export { expect };
