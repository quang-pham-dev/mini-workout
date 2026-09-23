import { expect, test } from '@playwright/test';

test('serves semantic HTML without client-side JavaScript', async ({
  page,
}) => {
  const indexable =
    process.env.VERCEL_ENV === 'production' &&
    process.env.LANDING_INDEXING_ENABLED === 'true';
  await page.goto('/');

  await expect(page).toHaveTitle('Mini Workout | Public site foundation');
  await expect(
    page.getByRole('heading', {
      name: 'A home for Mini Workout stories and campaigns.',
      level: 1,
    }),
  ).toBeVisible();
  await expect(page.getByRole('main')).toBeVisible();
  await expect(
    page.getByRole('navigation', { name: 'Primary navigation' }),
  ).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://example.com/',
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    indexable ? 'index, follow' : 'noindex, nofollow',
  );
  await expect(page.locator('script[src]')).toHaveCount(0);

  const jsonLd = await page
    .locator('script[type="application/ld+json"]')
    .textContent();
  expect(JSON.parse(jsonLd ?? '{}')).toMatchObject({
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Mini Workout',
  });
});

test('skip link is the first keyboard stop and moves focus to main content', async ({
  page,
}) => {
  await page.goto('/');
  await page.keyboard.press('Tab');

  const skipLink = page.getByRole('link', { name: 'Skip to content' });
  await expect(skipLink).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
});

test('publishes crawler directives, sitemap, and a real 404 response', async ({
  page,
}) => {
  const indexable =
    process.env.VERCEL_ENV === 'production' &&
    process.env.LANDING_INDEXING_ENABLED === 'true';
  const robots = await page.request.get('/robots.txt');
  const sitemap = await page.request.get('/sitemap.xml');
  const missingPage = await page.request.get('/a-page-that-does-not-exist/');

  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain(
    indexable ? 'Sitemap: https://example.com/sitemap.xml' : 'Disallow: /',
  );
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain('<loc>https://example.com/</loc>');
  expect(await sitemap.text()).not.toContain('/404/');
  expect(missingPage.status()).toBe(404);
  expect(await missingPage.text()).toContain('Page not found | Mini Workout');
});

test('keeps the public shell within the viewport on mobile', async ({
  page,
}) => {
  await page.goto('/');

  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));

  expect(dimensions.documentWidth).toBeLessThanOrEqual(
    dimensions.viewportWidth,
  );
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
});
