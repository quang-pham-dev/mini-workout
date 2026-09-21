import { expect, test } from '../../fixtures/test';

test('uses Light by default and keeps the theme control out of public pages', async ({
  page,
}) => {
  await page.goto('/login');
  await expect(page.locator('html')).toHaveClass(/light/);
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme-preference',
    'light',
  );
  await expect(page.getByRole('button', { name: 'Theme' })).toHaveCount(0);
});

test('applies a persisted Dark preference before hydration', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('mini-workout-theme', 'dark'),
  );
  await page.goto('/login');
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
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme-preference',
    'dark',
  );
});

test('captures the System theme at a deterministic public viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() =>
    localStorage.setItem('mini-workout-theme', 'system'),
  );
  await page.goto('/login');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme-preference',
    'system',
  );
});

test('keeps explicit Light visual state when the operating system is dark', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.addInitScript(() =>
    localStorage.setItem('mini-workout-theme', 'light'),
  );
  await page.goto('/login');
  await expect(page.locator('html')).toHaveClass(/light/);
  await expect(page.locator('html')).not.toHaveClass(/dark/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
});

test('keeps an explicit Dark preference when the system is Light', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.addInitScript(() =>
    localStorage.setItem('mini-workout-theme', 'dark'),
  );
  await page.goto('/login');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
});
