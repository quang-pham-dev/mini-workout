import {
  type Browser,
  type Page,
  test as base,
  expect,
} from '@playwright/test';

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

export const test = base.extend<Fixtures>({
  activePage: async ({ browser }, use) =>
    pageWithStorageState(browser, 'e2e/.auth/active.json', use),
  emptyPage: async ({ browser }, use) =>
    pageWithStorageState(browser, 'e2e/.auth/empty.json', use),
  longPage: async ({ browser }, use) =>
    pageWithStorageState(browser, 'e2e/.auth/long.json', use),
  newUserPage: async ({ browser }, use) =>
    pageWithStorageState(browser, 'e2e/.auth/new-user.json', use),
});

export { expect };
