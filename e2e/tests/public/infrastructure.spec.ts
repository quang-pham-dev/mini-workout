import { expect, test } from '@playwright/test';

test('loads the public authentication entry point', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page).toHaveURL(/\/login$/);
  await expect(page).toHaveTitle('Login');
  await expect(page.locator('body')).toBeVisible();
});

test('applies the stored theme through the inline bootstrap before hydration', async ({
  page,
}) => {
  let blockedHydrationScripts = 0;
  await page.addInitScript(() =>
    localStorage.setItem('mini-workout-theme', 'dark'),
  );
  await page.route('**/*', async (route) => {
    const request = route.request();
    const pathname = new URL(request.url()).pathname;
    if (request.resourceType() === 'script' && pathname.startsWith('/_next/')) {
      blockedHydrationScripts += 1;
      await route.abort();
      return;
    }
    await route.continue();
  });
  await page.goto('/');

  expect(blockedHydrationScripts).toBeGreaterThan(0);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme-preference',
    'dark',
  );
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    'content',
    'oklch(0.14 0.008 250)',
  );
});
