import {
  expectFullyInViewport,
  expectNoHorizontalOverflow,
} from '../../fixtures/responsive';
import { expect, test } from '../../fixtures/test';

test('keeps the public theme preview usable without horizontal overflow', async ({
  page,
}) => {
  await page.goto('/theme-preview');
  await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(412);
  await expectNoHorizontalOverflow(page);

  await page.getByRole('button', { name: 'Theme' }).tap();
  const menu = page.getByRole('menu', { name: 'Theme options' });
  await expect(menu).toBeVisible();
  await expectFullyInViewport(page, menu);
  await expectNoHorizontalOverflow(page);
  await page.getByRole('menuitemradio', { name: 'Dark' }).tap();

  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expectNoHorizontalOverflow(page);
});
