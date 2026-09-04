import { expect, test } from '../fixtures/test';

test('uses Light by default and keeps the theme control out of public pages', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/light/);
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme-preference',
    'light',
  );
  await expect(page.getByRole('button', { name: 'Theme' })).toHaveCount(0);
});

test('applies persisted Dark at startup and persists menu selection', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('mini-workout-theme', 'dark'),
  );
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    'content',
    'oklch(0.14 0.008 250)',
  );
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme-preference',
    'dark',
  );
});

test('keeps explicit Light visual state when the operating system is dark', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() =>
    localStorage.setItem('mini-workout-theme', 'light'),
  );
  await page.goto('/');
  await expect(page.locator('html')).toHaveClass(/light/);
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('follows System changes but explicit themes ignore system changes', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');
  await page.evaluate(() =>
    localStorage.setItem('mini-workout-theme', 'system'),
  );
  await page.reload();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveClass(/light/);
  await page.evaluate(() => localStorage.setItem('mini-workout-theme', 'dark'));
  await page.reload();
  await page.emulateMedia({ colorScheme: 'light' });
  await expect(page.locator('html')).toHaveClass(/dark/);
});

test.describe('authenticated theme control', () => {
  test.skip(
    !process.env.E2E_DATABASE_URL || !process.env.DATABASE_URL,
    'requires the disposable authenticated E2E database',
  );

  test('keeps the Theme menu in the authenticated header and supports keyboard selection', async ({
    activePage,
  }) => {
    await activePage.goto('/home');
    const trigger = activePage.getByRole('button', { name: 'Theme' });
    await expect(trigger).toHaveCount(1);
    await trigger.press('Enter');
    await expect(activePage.getByRole('menu')).toBeVisible();
    await activePage.getByRole('menuitemradio', { name: 'Dark' }).focus();
    await activePage.keyboard.press('Enter');
    await expect(activePage.locator('html')).toHaveClass(/dark/);
    await expect(activePage.locator('html')).toHaveAttribute(
      'data-theme-preference',
      'dark',
    );
  });
});
