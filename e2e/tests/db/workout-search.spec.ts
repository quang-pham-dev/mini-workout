import { expect, test } from '../../fixtures/user.ts';

test('keeps workout search and filters in the URL', async ({ activePage }) => {
  await activePage.goto(
    '/workouts?q=mobility&category=mobility&level=BEGINNER',
  );

  await expect(
    activePage.getByRole('heading', { name: 'Find your next session.' }),
  ).toBeVisible();
  await expect(activePage).toHaveURL(
    '/workouts?q=mobility&category=mobility&level=BEGINNER',
  );
  await expect(activePage.locator('#workout-search')).toHaveValue('mobility');
  await expect(activePage.locator('#workout-category')).toHaveValue('mobility');
  await expect(activePage.locator('#workout-level')).toHaveValue('BEGINNER');
  await expect(
    activePage.getByRole('link', { name: /Move better, feel lighter/ }),
  ).toBeVisible();
});

test('treats empty URL filters as the default browse state', async ({
  activePage,
}) => {
  await activePage.goto('/workouts?q=calm&category=&level=');

  await expect(
    activePage.getByRole('heading', { name: 'Find your next session.' }),
  ).toBeVisible();
  await expect(activePage.locator('#workout-search')).toHaveValue('calm');
  await expect(activePage.locator('#workout-category')).toHaveValue('');
  await expect(activePage.locator('#workout-level')).toHaveValue('');
  await expect(
    activePage.getByText('No sessions matched those filters.'),
  ).toBeVisible();
});
