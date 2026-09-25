import { expect, test } from '@playwright/test';

test('serves semantic HTML without external JavaScript', async ({ page }) => {
  const indexable =
    process.env.VERCEL_ENV === 'production' &&
    process.env.LANDING_INDEXING_ENABLED === 'true';
  await page.goto('/');

  await expect(page).toHaveTitle(
    'Mini Workout | A movement habit that fits real life',
  );
  await expect(
    page.getByRole('heading', {
      name: 'Build a movement habit that fits real life.',
      level: 1,
    }),
  ).toBeVisible();
  await expect(page.getByRole('main')).toBeVisible();
  await expect(page.getByRole('banner')).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Find your kind of movement', level: 2 }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'How it works', level: 2 }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Build my routine' }).first(),
  ).toHaveAttribute('href', 'https://app.example.com/register');
  await expect(
    page.getByRole('img', { name: /woman holding a low lunge/i }),
  ).toBeVisible();
  await expect(
    page.getByRole('img', { name: /man stretching his side/i }),
  ).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://example.com/',
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    indexable ? 'index, follow' : 'noindex, nofollow',
  );
  await expect(page.locator('meta[name="theme-color"]')).toHaveCount(2);
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
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const dimensions = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));

  expect(dimensions.documentWidth).toBeLessThanOrEqual(
    dimensions.viewportWidth,
  );
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.locator('summary[aria-label="Menu"]').click();
  await expect(
    page.getByRole('link', { name: 'How it works' }).last(),
  ).toBeVisible();

  const supportingImage = page.getByRole('img', {
    name: /man stretching his side/i,
  });
  await supportingImage.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      supportingImage.evaluate((image) => (image as HTMLImageElement).complete),
    )
    .toBe(true);
});

test('uses the system color scheme without changing the page content', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await page.goto('/');

  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(
    page.getByRole('heading', {
      name: 'Build a movement habit that fits real life.',
      level: 1,
    }),
  ).toBeVisible();
});

test('publishes the Mobility editorial category as static SEO content', async ({
  page,
}) => {
  await page.goto('/movement/mobility/');

  await expect(page).toHaveTitle(
    'Mobility exercises for everyday movement | Mini Workout',
  );
  await expect(
    page.getByRole('heading', {
      name: 'Move with more room.',
      level: 1,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Start where you feel it', level: 2 }),
  ).toBeVisible();
  await expect(
    page.getByText('Mobility', { exact: true }).first(),
  ).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://example.com/movement/mobility/',
  );
  await expect(page.locator('script[src]')).toHaveCount(0);
  await expect(
    page.getByRole('main').getByRole('link', { name: 'Ways to move' }),
  ).toHaveAttribute('href', '/#ways-to-move');

  const sitemap = await page.request.get('/sitemap.xml');
  expect(await sitemap.text()).toContain(
    '<loc>https://example.com/movement/mobility/</loc>',
  );
  await expect(
    page.getByRole('link', {
      name: 'A gentler way to explore your range',
    }),
  ).toHaveAttribute('href', '/articles/a-gentler-way-to-explore-mobility/');
});

test('publishes a readable Mobility article with controlled structured content', async ({
  page,
}) => {
  await page.goto('/articles/a-gentler-way-to-explore-mobility/');

  await expect(page).toHaveTitle(
    'A gentler way to explore mobility | Mini Workout',
  );
  await expect(
    page.getByRole('heading', {
      name: 'A gentler way to explore your range',
      level: 1,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: 'Range is not a score', level: 2 }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'Explore mobility' }),
  ).toHaveAttribute('href', '/movement/mobility/');
  await expect(
    page.getByRole('img', { name: /woman exploring a seated side bend/i }),
  ).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    'href',
    'https://example.com/articles/a-gentler-way-to-explore-mobility/',
  );
  await expect(page.locator('script[src]')).toHaveCount(0);

  const jsonLd = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ??
      '{}',
  );
  expect(jsonLd).toMatchObject({
    '@type': 'Article',
    headline: 'A gentler way to explore your range',
    author: {
      '@type': 'Organization',
      name: 'Mini Workout editorial',
    },
  });

  const sitemap = await page.request.get('/sitemap.xml');
  expect(await sitemap.text()).toContain(
    '<loc>https://example.com/articles/a-gentler-way-to-explore-mobility/</loc>',
  );
});
