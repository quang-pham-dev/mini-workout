import { expect, test } from '@playwright/test';

test('loads the public landing page', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page).toHaveTitle(/Mini Workout/);
  await expect(page.locator('body')).toBeVisible();
});
