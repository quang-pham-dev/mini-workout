import { resolveDatabaseUrl } from '../../fixtures/database-env.ts';
import { cleanupDatabase, configureUser } from '../../fixtures/database.ts';
import {
  type CapturedAuthEmail,
  readCapturedAuthEmails,
} from '../../fixtures/email-capture.ts';
import { getFormAlert } from '../../fixtures/locators.ts';
import { databaseBaseURL } from '../../playwright.config.ts';
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
    await expect(getFormAlert(page)).toHaveText(
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

test('flag-on password recovery is generic, revokes sessions, and consumes its token once', async ({
  page,
}) => {
  const email = `recovery-${randomUUID()}@example.test`;
  const password = 'RecoveryOld123!';
  const newPassword = 'RecoveryNew123!';

  try {
    const signup = await page.request.post('/api/auth/sign-up/email', {
      headers: { Origin: databaseBaseURL },
      data: { name: 'Recovery user', email, password },
    });
    expect(signup.ok()).toBeTruthy();
    await configureUser(databaseUrl, email, {
      onboardingCompleted: false,
      emailVerified: true,
    });

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(password);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/onboarding/);

    await page.goto('/forgot-password');
    await expect(page.getByLabel('Email')).toBeVisible({ timeout: 10_000 });
    await page.getByLabel('Email').fill(email);
    await page.getByRole('button', { name: 'Send reset link' }).click();
    await expect(page.getByRole('status')).toHaveText(
      'If an account matches, we sent a password reset link.',
    );

    await expect
      .poll(
        () =>
          readCapturedAuthEmails(databaseUrl).filter(
            (message) =>
              message.to === email && message.kind === 'password-reset',
          ),
        { timeout: 10_000 },
      )
      .toHaveLength(1);
    const message = readCapturedAuthEmails(databaseUrl).find(
      (candidate): candidate is CapturedAuthEmail =>
        candidate.to === email && candidate.kind === 'password-reset',
    );
    expect(message).toBeDefined();
    await page.goto(message!.url);
    const resetUrl = page.url();
    const resetToken = new URL(resetUrl).searchParams.get('token');
    expect(resetToken).toBeTruthy();

    const resetRegion = page.getByRole('region', {
      name: 'Choose a new password',
    });
    await expect(resetRegion.locator('input[name="token"]')).toHaveValue(
      resetToken!,
    );
    await resetRegion.getByLabel('New password').fill(newPassword);
    await resetRegion.getByRole('button', { name: 'Update password' }).click();
    await expect(page).toHaveURL('/login?reset=1');

    await page.goto('/home');
    await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fhome/);

    await page.goto(resetUrl);
    const replayResetRegion = page.getByRole('region', {
      name: 'Choose a new password',
    });
    await expect(replayResetRegion.locator('input[name="token"]')).toHaveValue(
      resetToken!,
    );
    await replayResetRegion
      .getByLabel('New password')
      .fill('RecoveryReplay123!');
    await replayResetRegion
      .getByRole('button', { name: 'Update password' })
      .click();
    await expect(replayResetRegion.locator('p[role="alert"]')).toHaveText(
      'This reset link is invalid or has expired.',
    );

    await page.goto('/reset-password?token=invalid-token');
    const invalidResetRegion = page.getByRole('region', {
      name: 'Choose a new password',
    });
    await invalidResetRegion
      .getByLabel('New password')
      .fill('RecoveryInvalid123!');
    await invalidResetRegion
      .getByRole('button', { name: 'Update password' })
      .click();
    await expect(invalidResetRegion.locator('p[role="alert"]')).toHaveText(
      'This reset link is invalid or has expired.',
    );

    await page.goto('/login');
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill(newPassword);
    await page.getByRole('button', { name: 'Sign in' }).click();
    await expect(page).toHaveURL(/\/onboarding/);
  } finally {
    await cleanupDatabase(databaseUrl, [email]);
  }
});
