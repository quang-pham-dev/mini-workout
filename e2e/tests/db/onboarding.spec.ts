import { expect, test } from '../../fixtures/user.ts';
import { databaseBaseURL } from '../../playwright.config.ts';

const origin = databaseBaseURL;

test('@critical onboarding requires an interest when a level is selected', async ({
  mutationUser,
}) => {
  const signup = await mutationUser.context.request.post(
    '/api/auth/sign-up/email',
    {
      headers: { Origin: origin },
      data: {
        name: mutationUser.name,
        email: mutationUser.email,
        password: mutationUser.password,
      },
    },
  );
  expect(signup.ok()).toBeTruthy();

  await mutationUser.page.goto('/onboarding');
  await mutationUser.page.getByLabel(/Beginner/).check();
  await mutationUser.page
    .getByRole('button', { name: 'Create my starting plan' })
    .click();
  await expect(mutationUser.page).toHaveURL(/\/onboarding\?error=invalid$/);
  await expect(mutationUser.page.getByRole('alert')).toHaveText(
    'Choose at least one focus and a pace to continue.',
  );
});

test('@critical onboarding requires a level when an interest is selected', async ({
  mutationUser,
}) => {
  const signup = await mutationUser.context.request.post(
    '/api/auth/sign-up/email',
    {
      headers: { Origin: origin },
      data: {
        name: mutationUser.name,
        email: mutationUser.email,
        password: mutationUser.password,
      },
    },
  );
  expect(signup.ok()).toBeTruthy();

  await mutationUser.page.goto('/onboarding');
  await mutationUser.page.getByLabel(/Mobility/).check();
  await mutationUser.page
    .getByRole('button', { name: 'Create my starting plan' })
    .click();
  await expect(mutationUser.page).toHaveURL(/\/onboarding\?error=invalid$/);
  await expect(mutationUser.page.getByRole('alert')).toHaveText(
    'Choose at least one focus and a pace to continue.',
  );
});

test('@critical onboarding persists a completed personalized profile', async ({
  mutationUser,
}) => {
  const signup = await mutationUser.context.request.post(
    '/api/auth/sign-up/email',
    {
      headers: { Origin: origin },
      data: {
        name: mutationUser.name,
        email: mutationUser.email,
        password: mutationUser.password,
      },
    },
  );
  expect(signup.ok()).toBeTruthy();

  await mutationUser.page.goto('/onboarding');

  await mutationUser.page.getByLabel(/Mobility/).check();
  await mutationUser.page.getByLabel(/Beginner/).check();
  await mutationUser.page
    .getByRole('button', { name: 'Create my starting plan' })
    .click();
  await expect(mutationUser.page).toHaveURL('/home');
  await expect(
    mutationUser.page.getByRole('heading', {
      name: 'Make a little room for movement.',
    }),
  ).toBeVisible();

  await mutationUser.page.reload();
  await expect(
    mutationUser.page
      .getByRole('region', { name: 'For your week' })
      .getByRole('link', { name: 'Move better, feel lighter' }),
  ).toBeVisible();

  await mutationUser.page.goto('/profile');
  const preferences = mutationUser.page.getByRole('region', {
    name: 'Movement Focus',
  });
  await expect(preferences).toContainText('beginner');
  await expect(preferences).toContainText('Mobility');
});
