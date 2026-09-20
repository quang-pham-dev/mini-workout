import { assertAuthResponse } from '../../fixtures/auth-request.ts';
import { configureUser } from '../../fixtures/database.ts';
import { type MutationUserSession, expect, test } from '../../fixtures/user.ts';
import { databaseBaseURL } from '../../playwright.config.ts';
import type { Locator, Page } from '@playwright/test';

const origin = databaseBaseURL;
const workoutName = 'Move better, feel lighter';

async function createCompletedPrerequisite(user: MutationUserSession) {
  const response = await user.context.request.post('/api/auth/sign-up/email', {
    headers: { Origin: origin },
    data: { name: user.name, email: user.email, password: user.password },
  });
  await assertAuthResponse(response, `Workout signup ${user.email}`);
  await configureUser(process.env.DATABASE_URL!, user.email, {
    onboardingCompleted: true,
    experienceLevel: 'BEGINNER',
    interestSlugs: ['mobility'],
  });
}

function workoutCard(page: Page) {
  return page
    .getByRole('article')
    .filter({
      has: page.getByRole('link', { name: workoutName }),
    })
    .first();
}

async function likeCount(page: Page): Promise<number> {
  const text = await workoutCard(page)
    .getByRole('button', { name: /Like workout|Unlike workout/ })
    .getByText(/^\d+$/)
    .textContent();
  expect(text).toMatch(/^\d+$/);
  const count = Number(text);
  expect(Number.isSafeInteger(count)).toBeTruthy();
  return count;
}

async function expectLikeCount(button: Locator, count: number) {
  await expect(button.getByText(String(count), { exact: true })).toHaveCount(1);
}

async function clickAndWaitForServerAction(page: Page, button: Locator) {
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => {
      const request = candidate.request();
      return (
        request.method() === 'POST' &&
        candidate.url() === page.url() &&
        request.headers()['next-action'] !== undefined
      );
    }),
    button.click(),
  ]);
  expect(response.ok()).toBeTruthy();
  expect(await response.finished()).toBeNull();
}

test('@critical save and unsave persist through favourites and reloads', async ({
  mutationUser,
}) => {
  await createCompletedPrerequisite(mutationUser);
  await mutationUser.page.goto('/home');
  const card = workoutCard(mutationUser.page);
  await clickAndWaitForServerAction(
    mutationUser.page,
    card.getByRole('button', { name: 'Save to favourites' }),
  );
  await expect(
    card.getByRole('button', { name: 'Remove from favourites' }),
  ).toHaveAttribute('aria-pressed', 'true');

  await mutationUser.page.goto('/favourites');
  await expect(
    mutationUser.page.getByRole('link', { name: workoutName }),
  ).toBeVisible();
  await mutationUser.page.reload();
  const savedCard = workoutCard(mutationUser.page);
  await expect(
    savedCard.getByRole('button', { name: 'Remove from favourites' }),
  ).toHaveAttribute('aria-pressed', 'true');

  await clickAndWaitForServerAction(
    mutationUser.page,
    savedCard.getByRole('button', { name: 'Remove from favourites' }),
  );
  await expect(
    mutationUser.page.getByRole('heading', {
      name: 'No saved workouts yet',
    }),
  ).toBeVisible();
  await mutationUser.page.reload();
  await expect(
    mutationUser.page.getByRole('heading', {
      name: 'No saved workouts yet',
    }),
  ).toBeVisible();
});

test('@critical workout thumbnails open the detail route', async ({
  mutationUser,
}) => {
  await createCompletedPrerequisite(mutationUser);
  await mutationUser.page.goto('/home');

  const card = workoutCard(mutationUser.page);
  await card.getByRole('link', { name: `Open ${workoutName}` }).click();

  await expect(mutationUser.page).toHaveURL(
    /\/workouts\/the-20-minute-reset\?from=home&transition=home-(recommended|latest)$/,
  );
  await expect(
    mutationUser.page.getByRole('heading', { name: workoutName }),
  ).toBeVisible();

  await mutationUser.page
    .getByRole('link', { name: 'Back to your week' })
    .click();
  await expect(mutationUser.page).toHaveURL('/home');
});

test('@critical like and unlike state and count agree between home and detail', async ({
  mutationUser,
}) => {
  await createCompletedPrerequisite(mutationUser);
  await mutationUser.page.goto('/home');
  const initialCount = await likeCount(mutationUser.page);
  await clickAndWaitForServerAction(
    mutationUser.page,
    workoutCard(mutationUser.page).getByRole('button', {
      name: 'Like workout',
    }),
  );
  await expectLikeCount(
    workoutCard(mutationUser.page).getByRole('button', {
      name: 'Unlike workout',
    }),
    initialCount + 1,
  );

  await mutationUser.page.reload();
  await expect(
    workoutCard(mutationUser.page).getByRole('button', {
      name: 'Unlike workout',
    }),
  ).toHaveAttribute('aria-pressed', 'true');
  await mutationUser.page
    .getByRole('link', { name: workoutName })
    .first()
    .click();
  const detailLike = mutationUser.page.getByRole('button', {
    name: 'Unlike workout',
  });
  await expectLikeCount(detailLike, initialCount + 1);

  await clickAndWaitForServerAction(mutationUser.page, detailLike);
  await expectLikeCount(
    mutationUser.page.getByRole('button', { name: 'Like workout' }),
    initialCount,
  );
  await mutationUser.page.reload();
  await expect(
    mutationUser.page.getByRole('button', { name: 'Like workout' }),
  ).toHaveAttribute('aria-pressed', 'false');
  await expectLikeCount(
    mutationUser.page.getByRole('button', { name: 'Like workout' }),
    initialCount,
  );
});

test('@critical saves and likes are isolated per user while like counts stay global', async ({
  mutationUser,
}) => {
  const secondUser = await mutationUser.newSession('second-user');
  await createCompletedPrerequisite(mutationUser);
  await createCompletedPrerequisite(secondUser);

  await mutationUser.page.goto('/home');
  const initialCount = await likeCount(mutationUser.page);
  await clickAndWaitForServerAction(
    mutationUser.page,
    workoutCard(mutationUser.page).getByRole('button', {
      name: 'Like workout',
    }),
  );
  await clickAndWaitForServerAction(
    mutationUser.page,
    workoutCard(mutationUser.page).getByRole('button', {
      name: 'Save to favourites',
    }),
  );

  await secondUser.page.goto('/home');
  const secondCard = workoutCard(secondUser.page);
  await expect(
    secondCard.getByRole('button', { name: 'Like workout' }),
  ).toHaveAttribute('aria-pressed', 'false');
  await expect(
    secondCard.getByRole('button', { name: 'Save to favourites' }),
  ).toHaveAttribute('aria-pressed', 'false');
  await expectLikeCount(
    secondCard.getByRole('button', { name: 'Like workout' }),
    initialCount + 1,
  );

  await clickAndWaitForServerAction(
    secondUser.page,
    secondCard.getByRole('button', { name: 'Like workout' }),
  );
  await mutationUser.page.reload();
  await expectLikeCount(
    workoutCard(mutationUser.page).getByRole('button', {
      name: 'Unlike workout',
    }),
    initialCount + 2,
  );
  await expect(
    workoutCard(mutationUser.page).getByRole('button', {
      name: 'Remove from favourites',
    }),
  ).toHaveAttribute('aria-pressed', 'true');

  await secondUser.page.goto('/favourites');
  await expect(
    secondUser.page.getByRole('heading', { name: 'No saved workouts yet' }),
  ).toBeVisible();
});
