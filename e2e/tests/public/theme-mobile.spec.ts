import { expectNoHorizontalOverflow } from '../../fixtures/responsive';
import { expect, test } from '../../fixtures/test';

test('keeps the public authentication entry point usable without horizontal overflow', async ({
  page,
}) => {
  await page.goto('/login');
  await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(412);
  await expectNoHorizontalOverflow(page);
});
