import { configureUser, testUsers } from '../../fixtures/database.ts';
import { expect, test } from '../../fixtures/test.ts';

test('ADMIN can sign in, persist the session, and sign out @critical', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel('Email').fill(testUsers.admin.email);
  await page.getByLabel('Password').fill(testUsers.admin.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/\/workouts$/);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Workouts' })).toBeVisible();
  await page.getByRole('button', { name: /sign out/i }).click();
  await expect(page).toHaveURL(/\/login/);
});

test('MEMBER is denied access to the admin workspace @critical', async ({
  memberPage,
}) => {
  await memberPage.goto('/workouts');
  await expect(memberPage).toHaveURL(/\/unauthorized$/);
});

test('a role downgrade invalidates an existing ADMIN session @critical', async ({
  adminPage,
}) => {
  const databaseUrl = process.env.E2E_DATABASE_URL!;
  try {
    await adminPage.goto('/workouts');
    await expect(
      adminPage.getByRole('heading', { name: 'Workouts' }),
    ).toBeVisible();
    await configureUser(databaseUrl, testUsers.admin.email, {
      onboardingCompleted: true,
      role: 'MEMBER',
    });
    await adminPage.reload();
    await expect(adminPage).toHaveURL(/\/unauthorized$/);
  } finally {
    await configureUser(databaseUrl, testUsers.admin.email, {
      onboardingCompleted: true,
      role: 'ADMIN',
    });
  }
});
