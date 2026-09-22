import { expect, test } from '@playwright/test';

test('loads the public landing and exposes clear auth entry points', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto('/');
  await expect(page).toHaveURL(/\/$/);
  await expect(page).toHaveTitle('Mini Workout');
  await expect(
    page.getByRole('heading', {
      name: 'Make room for the way you want to feel.',
    }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Start free' })).toHaveAttribute(
    'href',
    '/register',
  );
  await expect(
    page.getByRole('link', { name: 'I already have an account' }),
  ).toHaveAttribute('href', '/login');
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

for (const recoveryRoute of [
  {
    path: '/forgot-password',
    heading: 'Reset your password',
    action: 'Send reset link',
  },
  {
    path: '/reset-password?token=browser-smoke-token',
    heading: 'Choose a new password',
    action: 'Update password',
  },
  {
    path: '/verify-email?error=INVALID_TOKEN',
    heading: 'Check your email',
    action: 'Resend verification email',
  },
]) {
  test(`renders ${recoveryRoute.path.split('?')[0]} from the production artifact`, async ({
    page,
  }) => {
    await page.goto(recoveryRoute.path);

    await expect(
      page.getByRole('heading', { name: recoveryRoute.heading }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: recoveryRoute.action }),
    ).toBeVisible();
  });
}
