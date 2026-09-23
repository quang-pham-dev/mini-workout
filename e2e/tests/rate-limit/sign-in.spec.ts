import { getFormAlert } from '../../fixtures/locators.ts';
import { expect, test } from '@playwright/test';
import { randomInt, randomUUID } from 'node:crypto';

test('sign-in shows safe rate-limit copy after the configured budget', async ({
  page,
}) => {
  const email = `rate-limit-${randomUUID()}@example.test`;
  const clientAddress = `198.51.100.${randomInt(1, 255)}`;

  await page.setExtraHTTPHeaders({ 'x-forwarded-for': clientAddress });
  await page.goto('/login');

  for (let attempt = 0; attempt < 6; attempt += 1) {
    await page.getByLabel('Email').fill(email);
    await page.getByLabel('Password').fill('IncorrectPassword123!');
    await page.getByRole('button', { name: 'Sign in' }).click();

    await expect(getFormAlert(page)).toHaveText(
      attempt < 5
        ? 'Invalid email or password.'
        : 'Too many sign-in attempts. Please wait and try again.',
    );
  }
});
