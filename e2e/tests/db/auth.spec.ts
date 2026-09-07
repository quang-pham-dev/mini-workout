import { configureUser } from '../../fixtures/database.ts';
import { type MutationUserSession, expect, test } from '../../fixtures/user.ts';
import { databaseBaseURL } from '../../playwright.config.ts';

const origin = databaseBaseURL;

async function clickAndWaitForServerAction(
  page: MutationUserSession['page'],
  buttonName: string,
) {
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => {
      const request = candidate.request();
      return (
        candidate.url() === page.url() &&
        request.method() === 'POST' &&
        request.headers()['next-action'] !== undefined
      );
    }),
    page.getByRole('button', { name: buttonName }).click(),
  ]);
  expect(response.ok()).toBeTruthy();
  expect(await response.finished()).toBeNull();
}

async function registerThroughUi(
  user: MutationUserSession,
  email = user.email,
) {
  await user.page.goto('/register');
  await user.page.getByLabel('Name').fill(user.name);
  await user.page.getByLabel('Email').fill(email);
  await user.page.getByLabel('Password', { exact: true }).fill(user.password);
  await user.page.getByLabel('Confirm password').fill(user.password);
  await user.page.getByRole('button', { name: 'Create account' }).click();
}

async function createCompletedPrerequisite(user: MutationUserSession) {
  const response = await user.context.request.post('/api/auth/sign-up/email', {
    headers: { Origin: origin },
    data: { name: user.name, email: user.email, password: user.password },
  });
  expect(response.ok()).toBeTruthy();
  await configureUser(process.env.DATABASE_URL!, user.email, {
    onboardingCompleted: true,
    experienceLevel: 'BEGINNER',
    interestSlugs: ['mobility'],
  });
}

test('@critical registration validates input and creates a signed-in account', async ({
  mutationUser,
}) => {
  await mutationUser.page.goto('/register');
  await mutationUser.page.getByLabel('Name').fill(mutationUser.name);
  await mutationUser.page.getByLabel('Email').fill(mutationUser.email);
  await mutationUser.page
    .getByLabel('Password', { exact: true })
    .fill(mutationUser.password);
  await mutationUser.page
    .getByLabel('Confirm password')
    .fill(`${mutationUser.password}x`);
  await mutationUser.page
    .getByRole('button', { name: 'Create account' })
    .click();

  await expect(mutationUser.page).toHaveURL(/\/register\?error=invalid$/);
  await expect(mutationUser.page.getByRole('alert')).toContainText(
    'Unable to create your account',
  );

  await registerThroughUi(mutationUser);
  await expect(mutationUser.page).toHaveURL('/onboarding');
  await expect(
    mutationUser.page.getByRole('heading', {
      name: 'A plan that feels like yours.',
    }),
  ).toBeVisible();

  await mutationUser.page.reload();
  await expect(mutationUser.page).toHaveURL('/onboarding');
});

test('@critical registration reports a duplicate account through the UI', async ({
  mutationUser,
}) => {
  await registerThroughUi(mutationUser);
  await expect(mutationUser.page).toHaveURL('/onboarding');

  const duplicateAttempt = await mutationUser.newSession('duplicate-attempt');
  await registerThroughUi(duplicateAttempt, mutationUser.email);
  await expect(duplicateAttempt.page).toHaveURL(
    /\/register\?error=unavailable$/,
  );
  await expect(duplicateAttempt.page.getByRole('alert')).toContainText(
    'Unable to create your account',
  );
});

test('@critical login rejects invalid credentials', async ({
  mutationUser,
}) => {
  await createCompletedPrerequisite(mutationUser);
  await mutationUser.context.clearCookies();

  await mutationUser.page.goto('/login');
  await mutationUser.page.getByLabel('Email').fill(mutationUser.email);
  await mutationUser.page
    .getByLabel('Password')
    .fill(`${mutationUser.password}x`);
  await mutationUser.page.getByRole('button', { name: 'Sign in' }).click();
  await expect(mutationUser.page).toHaveURL(/\/login\?error=invalid$/);
  await expect(mutationUser.page.getByRole('alert')).toHaveText(
    'Invalid email or password.',
  );

  await mutationUser.page.getByLabel('Email').fill(mutationUser.email);
  await mutationUser.page.getByLabel('Password').fill(mutationUser.password);
  await mutationUser.page.getByRole('button', { name: 'Sign in' }).click();
  await expect(mutationUser.page).toHaveURL('/home');
  await expect(
    mutationUser.page.getByRole('heading', {
      name: 'Make a little room for movement.',
    }),
  ).toBeVisible();
  await mutationUser.page.reload();
  await expect(mutationUser.page).toHaveURL('/home');
});

test('@critical fresh valid login follows a protected deep link', async ({
  mutationUser,
}) => {
  await createCompletedPrerequisite(mutationUser);
  await mutationUser.context.clearCookies();

  await mutationUser.page.goto('/favourites?from=login');
  await expect(mutationUser.page).toHaveURL(
    /\/login\?callbackUrl=%2Ffavourites%3Ffrom%3Dlogin$/,
  );

  await mutationUser.page.getByLabel('Email').fill(mutationUser.email);
  await mutationUser.page.getByLabel('Password').fill(mutationUser.password);
  await mutationUser.page.getByRole('button', { name: 'Sign in' }).click();
  await expect(mutationUser.page).toHaveURL('/favourites?from=login');
  await expect(
    mutationUser.page.getByRole('heading', { name: 'Saved Sessions' }),
  ).toBeVisible();

  await mutationUser.page.reload();
  await expect(mutationUser.page).toHaveURL('/favourites?from=login');
});

test('@critical sign out invalidates the current UI session', async ({
  mutationUser,
}) => {
  await createCompletedPrerequisite(mutationUser);
  await mutationUser.page.goto('/profile');
  await expect(
    mutationUser.page.getByRole('heading', { name: mutationUser.name }),
  ).toBeVisible();

  await clickAndWaitForServerAction(mutationUser.page, 'Sign out');
  await mutationUser.page.goto('/home');
  await expect(mutationUser.page).toHaveURL(/\/login\?callbackUrl=%2Fhome$/);
  await mutationUser.page.reload();
  await expect(
    mutationUser.page.getByRole('heading', { name: 'Welcome back' }),
  ).toBeVisible();
});
