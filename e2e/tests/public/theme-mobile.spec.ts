import { expectNoHorizontalOverflow } from '../../fixtures/responsive';
import { expect, test } from '../../fixtures/test';

test('keeps the public landing usable without horizontal overflow', async ({
  page,
}) => {
  await page.goto('/');
  await expect.poll(() => page.evaluate(() => window.innerWidth)).toBe(412);
  await expectNoHorizontalOverflow(page);
});

test('keeps auth recovery routes usable without horizontal overflow', async ({
  page,
}) => {
  for (const path of [
    '/forgot-password',
    '/reset-password?token=browser-smoke-token',
    '/verify-email?error=INVALID_TOKEN',
  ]) {
    await page.goto(path);
    await expectNoHorizontalOverflow(page);
  }
});
