import { expect, test } from '../fixtures/test';

test('loads the populated home fixture', async ({ activePage }) => {
  await activePage.goto('/home');
  await expect(activePage).toHaveURL('/home');
  await expect(
    activePage
      .getByRole('region', { name: 'For your week' })
      .getByRole('link', { name: 'The 20-minute reset' }),
  ).toBeVisible();
});

test('loads the empty favourites fixture', async ({ emptyPage }) => {
  await emptyPage.goto('/favourites');
  await expect(
    emptyPage.getByRole('heading', { name: 'No saved workouts yet' }),
  ).toBeVisible();
});
