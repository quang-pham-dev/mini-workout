import { expect, test } from '../../fixtures/test';

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

test('persists Dark selected through the UI across reload', async ({
  page,
}) => {
  await page.goto('/theme-preview');
  await page.getByRole('button', { name: 'Theme' }).click();
  await page.getByRole('menuitemradio', { name: 'Dark' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page).toHaveURL(/theme-preview/);
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute(
    'content',
    'oklch(0.14 0.008 250)',
  );
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme-preference',
    'dark',
  );
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem('mini-workout-theme')))
    .toBe('dark');

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme-preference',
    'dark',
  );
});

test('moves through the theme menu with real Tab and Shift+Tab', async ({
  page,
}) => {
  await page.goto('/theme-preview');
  const previous = page.getByRole('button', { name: 'Previous control' });
  const trigger = page.getByRole('button', { name: 'Theme' });
  const next = page.getByRole('button', { name: 'Next control' });

  await trigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('menu')).toBeHidden();
  await expect(next).toBeFocused();

  await trigger.focus();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('menu')).toBeHidden();
  await expect(previous).toBeFocused();
});

test('captures the System theme at a deterministic public viewport', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/theme-preview');
  await page.getByRole('button', { name: 'Theme' }).click();
  await page.getByRole('menuitemradio', { name: 'System' }).click();
  await expect(page.locator('html')).toHaveAttribute(
    'data-theme-preference',
    'system',
  );
  await expect(page).toHaveScreenshot('theme-system.png', {
    animations: 'disabled',
  });
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

test('uses the matching landing logo image in Light and Dark themes', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.locator('main')).toHaveScreenshot('landing-light.png');

  await page.evaluate(() => localStorage.setItem('mini-workout-theme', 'dark'));
  await page.reload();
  await expect(page.locator('main')).toHaveScreenshot('landing-dark.png');
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
