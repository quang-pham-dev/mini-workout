import { expect, test } from '../../fixtures/test.ts';

test('ADMIN direct and client navigation remain authenticated', async ({
  adminPage,
}) => {
  await adminPage.goto('/workouts');
  await expect(
    adminPage.getByRole('table', { name: /workout/i }),
  ).toBeVisible();
  await adminPage.getByRole('link', { name: 'Coaches' }).click();
  await expect(adminPage).toHaveURL(/\/coaches$/);
  await adminPage.goBack();
  await expect(adminPage).toHaveURL(/\/workouts$/);
  await adminPage.reload();
  await expect(
    adminPage.getByRole('heading', { name: 'Workouts' }),
  ).toBeVisible();
});

for (const path of ['/login', '/unauthorized', '/missing']) {
  test(`security headers are present on ${path}`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.headers()['content-security-policy']).toBeTruthy();
    expect(response.headers()['x-content-type-options']).toBe('nosniff');
    expect(response.headers()['referrer-policy']).toBeTruthy();
  });
}

test('unauthenticated Admin redirect retains security headers', async ({
  request,
}) => {
  const response = await request.get('/workouts', { maxRedirects: 0 });
  expect(response.status()).toBeGreaterThanOrEqual(300);
  expect(response.status()).toBeLessThan(400);
  expect(response.headers()['location']).toContain('/login');
  expect(response.headers()['content-security-policy']).toBeTruthy();
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
});

test('unknown auth route returns a protected error response', async ({
  request,
}) => {
  const response = await request.get('/api/auth/__missing', {
    maxRedirects: 0,
  });
  expect(response.status()).toBeGreaterThanOrEqual(400);
  expect(response.headers()['content-security-policy']).toBeTruthy();
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
});

test('rejected content negotiation retains security headers', async ({
  request,
}) => {
  const response = await request.get('/login', {
    headers: { Accept: 'application/json' },
    maxRedirects: 0,
  });
  expect(response.status()).toBeGreaterThanOrEqual(400);
  expect(response.headers()['content-security-policy']).toBeTruthy();
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
});
