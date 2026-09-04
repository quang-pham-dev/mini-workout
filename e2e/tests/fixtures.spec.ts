import { expect, test } from '../fixtures/test';

test('loads the populated home fixture', async ({ activePage }) => {
  await activePage.goto('/home');
  await expect(activePage).toHaveURL('/home');
  await expect(activePage.getByText('The 20-minute reset')).toBeVisible();
});

test('loads the empty favourites fixture', async ({ emptyPage }) => {
  await emptyPage.goto('/favourites');
  await expect(emptyPage.getByText(/no saved workouts yet/i)).toBeVisible();
});
