import { expect, test } from '../../fixtures/user.ts';

test('home exposes seeded categories and opens a category collection', async ({
  activePage,
}) => {
  await activePage.goto('/home');

  const categories = activePage.getByRole('region', {
    name: 'Start with what feels good',
  });
  await expect(categories).toBeVisible();
  await expect(
    categories.getByRole('link', { name: /Strength/ }),
  ).toBeVisible();

  await categories.getByRole('link', { name: /Strength/ }).click();
  await expect(activePage).toHaveURL('/categories/strength');
  await expect(
    activePage.getByRole('heading', { name: 'Strength' }),
  ).toBeVisible();
  await expect(
    activePage.getByRole('link', { name: /The 20-minute reset/ }),
  ).toBeVisible();
});
