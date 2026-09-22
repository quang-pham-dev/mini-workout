import { resolveDatabaseUrl } from '../../fixtures/database-env.ts';
import { cleanupDatabase } from '../../fixtures/database.ts';
import {
  type CapturedAuthEmail,
  readCapturedAuthEmails,
} from '../../fixtures/email-capture.ts';
import { expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const databaseUrl = resolveDatabaseUrl(process.env);

test('flag-on signup requires verification and reaches onboarding after the captured link', async ({
  page,
}) => {
  const email = `verification-${randomUUID()}@example.test`;
  const password = 'VerificationTest123!';

  try {
    await page.goto('/register');
    await page.getByLabel('Name').fill('Verification user');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password', { exact: true }).fill(password);
    await page.getByLabel('Confirm password').fill(password);
    await page.getByRole('button', { name: 'Create account' }).click();
    await expect(page).toHaveURL(/\/verify-email$/);

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page.getByRole('alert')).toHaveText(
      'Please verify your email before signing in.',
    );
    await expect(
      page.getByRole('link', { name: 'Resend verification email' }),
    ).toBeVisible();

    await expect
      .poll(
        () =>
          readCapturedAuthEmails(databaseUrl).filter(
            (message) =>
              message.to === email && message.kind === 'verification',
          ),
        { timeout: 10_000 },
      )
      .toHaveLength(1);
    const message = readCapturedAuthEmails(databaseUrl).find(
      (candidate): candidate is CapturedAuthEmail =>
        candidate.to === email && candidate.kind === 'verification',
    );
    expect(message).toBeDefined();

    await page.goto(message!.url);
    await expect(page).toHaveURL(/\/verify-email/);
    await page.goto('/onboarding');
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(
      page.getByRole('heading', { name: 'A plan that feels like yours.' }),
    ).toBeVisible();
  } finally {
    await cleanupDatabase(databaseUrl, [email]);
  }
});
