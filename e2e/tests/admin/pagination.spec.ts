import { expect, test } from '../../fixtures/test.ts';

test('cursor search survives navigation history and refresh', async ({
  adminPage,
}) => {
  await adminPage.goto('/workouts');
  const next = adminPage.getByRole('link', { name: /next page/i });
  if (await next.isVisible()) {
    await next.click();
    await expect(adminPage).toHaveURL(/cursor=/);
    const cursorUrl = adminPage.url();
    await adminPage.reload();
    expect(adminPage.url()).toBe(cursorUrl);
    await adminPage.goBack();
    await expect(adminPage).toHaveURL(/\/workouts$/);
    await adminPage.goForward();
    expect(adminPage.url()).toBe(cursorUrl);
  } else {
    await expect(
      adminPage.getByRole('table', { name: /workout/i }),
    ).toBeVisible();
  }
});
