import { expect, test } from '@playwright/test';

test('loads the public landing page', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page).toHaveTitle(/Mini Workout/);
  await expect(page.locator('body')).toBeVisible();
});

test('applies the persisted theme before the page paints', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('mini-workout-theme', 'dark'),
  );
  await page.goto('/');

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    'content',
    '#111318',
  );
});
