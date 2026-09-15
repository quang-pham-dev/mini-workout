import { expect, test } from '../../fixtures/test.ts';

test('mobile login is keyboard accessible and does not overflow', async ({
  page,
}) => {
  await page.goto('/login');
  await page.keyboard.press('Tab');
  await expect(page.getByLabel('Email')).toBeFocused();
  const overflows = await page.evaluate(
    () =>
      document.documentElement.scrollWidth >
      document.documentElement.clientWidth,
  );
  expect(overflows).toBe(false);
});

for (const width of [375, 768, 1024, 1440]) {
  test(`admin shell remains usable at ${width}px`, async ({ adminPage }) => {
    await adminPage.setViewportSize({ width, height: 900 });
    await adminPage.goto('/workouts');
    await expect(
      adminPage.getByRole('heading', { name: 'Workouts' }),
    ).toBeVisible();
    const overflows = await adminPage.evaluate(
      () =>
        document.documentElement.scrollWidth >
        document.documentElement.clientWidth,
    );
    expect(overflows).toBe(false);
  });
}
