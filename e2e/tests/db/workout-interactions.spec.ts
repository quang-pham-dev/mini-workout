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

async function clickAndWaitForEngagementMutation(page: Page, button: Locator) {
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => {
      const request = candidate.request();
      return (
        ['PUT', 'DELETE'].includes(request.method()) &&
        /\/api\/v1\/workouts\/[^/]+\/(favorite|like)$/.test(candidate.url())
      );
    }),
    button.click(),
  ]);
  expect(response.ok()).toBeTruthy();
  expect(await response.finished()).toBeNull();
}

async function createSyntheticWorkoutVideo(page: Page): Promise<Buffer> {
  const encodedVideo = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 180;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D context is unavailable');

    const mimeType = 'video/mp4;codecs=avc1.42E01E';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      throw new Error('Chromium cannot generate the deterministic MP4 fixture');
    }
    const stream = canvas.captureStream(15);
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];
    recorder.addEventListener('dataavailable', (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    });
    const stopped = new Promise<void>((resolve) => {
      recorder.addEventListener('stop', () => resolve(), { once: true });
    });

    recorder.start();
    for (let frame = 0; frame < 24; frame += 1) {
      context.fillStyle = frame % 2 === 0 ? '#cc5b2c' : '#132238';
      context.fillRect(0, 0, canvas.width, canvas.height);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    recorder.stop();
    await stopped;
    stream.getTracks().forEach((track) => track.stop());

    const blob = new Blob(chunks, { type: mimeType });
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener('load', () => resolve(String(reader.result)), {
        once: true,
      });
      reader.addEventListener('error', () => reject(reader.error), {
        once: true,
      });
      reader.readAsDataURL(blob);
    });
    return dataUrl.slice(dataUrl.indexOf(',') + 1);
  });

  return Buffer.from(encodedVideo, 'base64');
}

test('@critical workout player plays, pauses, seeks, and handles source errors safely', async ({
  mutationUser,
}) => {
  await createCompletedPrerequisite(mutationUser);
  const media = await createSyntheticWorkoutVideo(mutationUser.page);
  const mediaPattern = '**/highest.mp4';
  await mutationUser.page.route(mediaPattern, (route) =>
    route.fulfill({
      body: media,
      contentType: 'video/mp4',
      headers: { 'Accept-Ranges': 'bytes' },
      status: 200,
    }),
  );

  await mutationUser.page.goto('/workouts/the-20-minute-reset');

  const playerRegion = mutationUser.page.getByRole('region', {
    name: 'The 20-minute reset video',
  });
  const mediaPlayer = playerRegion.getByRole('group', {
    name: 'Media player',
  });
  const video = playerRegion.locator('video');
  const playButton = playerRegion.getByRole('button', { name: 'Play' });

  await expect(mediaPlayer).toBeVisible();
  await expect(video).toHaveAttribute('playsinline', '');
  await expect(video).toHaveAttribute('preload', 'metadata');
  await expect(video).not.toHaveAttribute('autoplay', /.*/);
  await expect
    .poll(() => video.evaluate((node) => (node as HTMLVideoElement).readyState))
    .toBeGreaterThan(0);
  await expect(
    video.evaluate((node) => (node as HTMLVideoElement).paused),
  ).resolves.toBe(true);

  await playButton.focus();
  await expect(playButton).toBeFocused();
  await mutationUser.page.keyboard.press('Enter');
  await expect
    .poll(() => video.evaluate((node) => (node as HTMLVideoElement).paused))
    .toBe(false);
  await expect
    .poll(() =>
      video.evaluate((node) => (node as HTMLVideoElement).currentTime),
    )
    .toBeGreaterThan(0);

  const seek = playerRegion.getByRole('slider', { name: 'Seek' });
  const beforeSeek = await video.evaluate(
    (node) => (node as HTMLVideoElement).currentTime,
  );
  await seek.focus();
  await mutationUser.page.keyboard.press('ArrowRight');
  await expect
    .poll(() =>
      video.evaluate((node) => (node as HTMLVideoElement).currentTime),
    )
    .toBeGreaterThan(beforeSeek);

  await playerRegion.getByRole('button', { name: 'Pause' }).click();
  await expect
    .poll(() => video.evaluate((node) => (node as HTMLVideoElement).paused))
    .toBe(true);

  await mutationUser.page.unroute(mediaPattern);
  await mutationUser.page.route(mediaPattern, (route) =>
    route.fulfill({ status: 404, body: 'missing' }),
  );
  await mutationUser.page.reload();

  const errorDialog = mutationUser.page.getByRole('alertdialog');
  await expect(errorDialog).toBeVisible();
  await expect(errorDialog).toContainText('Something went wrong.');
  await expect(errorDialog).not.toContainText('stream.mux.com');
  await expect(errorDialog).not.toContainText('highest.mp4');
});

test('@critical save and unsave persist through favourites and reloads', async ({
  mutationUser,
}) => {
  await createCompletedPrerequisite(mutationUser);
  await mutationUser.page.goto('/home');
  const card = workoutCard(mutationUser.page);
  await clickAndWaitForEngagementMutation(
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

  await clickAndWaitForEngagementMutation(
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
  await clickAndWaitForEngagementMutation(
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
  const matchingCards = mutationUser.page.getByRole('article').filter({
    has: mutationUser.page.getByRole('link', { name: workoutName }),
  });
  for (const duplicateCard of await matchingCards.all()) {
    await expect(
      duplicateCard.getByRole('button', { name: 'Unlike workout' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await expectLikeCount(
      duplicateCard.getByRole('button', { name: 'Unlike workout' }),
      initialCount + 1,
    );
  }

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

  await clickAndWaitForEngagementMutation(mutationUser.page, detailLike);
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
  await clickAndWaitForEngagementMutation(
    mutationUser.page,
    workoutCard(mutationUser.page).getByRole('button', {
      name: 'Like workout',
    }),
  );
  await clickAndWaitForEngagementMutation(
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

  await clickAndWaitForEngagementMutation(
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
