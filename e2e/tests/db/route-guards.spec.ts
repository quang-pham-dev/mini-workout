import { assertAuthResponse } from '../../fixtures/auth-request.ts';
import { configureUser } from '../../fixtures/database.ts';
import { type MutationUserSession, expect, test } from '../../fixtures/user.ts';
import { databaseBaseURL } from '../../playwright.config.ts';

const origin = databaseBaseURL;
const protectedRoutes = [
  { path: '/home', content: 'Make a little room for movement.' },
  { path: '/favourites', content: 'Saved Sessions' },
  { path: '/profile', content: 'Movement Focus' },
  {
    path: '/workouts/move-better-feel-lighter',
    content: 'Move better, feel lighter',
  },
] as const;

async function createPrerequisite(
  user: MutationUserSession,
  onboardingCompleted: boolean,
) {
  const response = await user.context.request.post('/api/auth/sign-up/email', {
    headers: { Origin: origin },
    data: { name: user.name, email: user.email, password: user.password },
  });
  await assertAuthResponse(response, `Route guard signup ${user.email}`);
  await configureUser(process.env.DATABASE_URL!, user.email, {
    onboardingCompleted,
    ...(onboardingCompleted
      ? {
          experienceLevel: 'BEGINNER' as const,
          interestSlugs: ['mobility'],
        }
      : {}),
  });
}

test('@critical anonymous users cannot view protected routes', async ({
  mutationUser,
}) => {
  for (const { path, content } of protectedRoutes) {
    await mutationUser.page.goto(path);
    await expect(mutationUser.page).toHaveURL(/\/login(?:\?|$)/);
    await expect(
      mutationUser.page.getByRole('heading', { name: 'Welcome back' }),
    ).toBeVisible();
    await expect(
      mutationUser.page.getByText(content, { exact: true }),
    ).toHaveCount(0);
  }
});

test('@critical stale sessions cannot view protected routes', async ({
  mutationUser,
}) => {
  await mutationUser.context.addCookies([
    {
      name: 'mini-workout-session',
      value: 'expired-e2e-session',
      url: origin,
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);

  for (const { path, content } of protectedRoutes) {
    await mutationUser.page.goto(path);
    await expect(mutationUser.page).toHaveURL(/\/login(?:\?|$)/);
    await expect(
      mutationUser.page.getByRole('heading', { name: 'Welcome back' }),
    ).toBeVisible();
    await expect(
      mutationUser.page.getByText(content, { exact: true }),
    ).toHaveCount(0);
  }
});

test('@critical unfinished users are restricted to onboarding', async ({
  mutationUser,
}) => {
  await createPrerequisite(mutationUser, false);

  for (const path of [
    '/home',
    '/favourites',
    '/profile',
    '/workouts/move-better-feel-lighter',
  ]) {
    await mutationUser.page.goto(path);
    await expect(mutationUser.page).toHaveURL('/onboarding');
  }
  await expect(
    mutationUser.page.getByRole('heading', {
      name: 'A plan that feels like yours.',
    }),
  ).toBeVisible();
});

test('@critical completed users bypass onboarding and can view protected routes', async ({
  mutationUser,
}) => {
  await createPrerequisite(mutationUser, true);

  await mutationUser.page.goto('/onboarding');
  await expect(mutationUser.page).toHaveURL('/home');
  await expect(
    mutationUser.page.getByRole('heading', {
      name: 'Make a little room for movement.',
    }),
  ).toBeVisible();

  for (const [path, heading] of [
    ['/favourites', 'Saved Sessions'],
    ['/profile', mutationUser.name],
    ['/workouts/move-better-feel-lighter', 'Move better, feel lighter'],
  ] as const) {
    await mutationUser.page.goto(path);
    await expect(mutationUser.page).toHaveURL(path);
    await expect(
      mutationUser.page.getByRole('heading', { name: heading }),
    ).toBeVisible();
  }
});
