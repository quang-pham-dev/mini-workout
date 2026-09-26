import { readFileSync } from 'node:fs';
import { join } from 'node:path';

function requireText(source, expected, label, failures) {
  if (!source.includes(expected))
    failures.push(`${label} is missing ${expected}`);
}

export function assertIndexingArtifact({ indexable, root, siteUrl }) {
  const normalizedSiteUrl = new URL(siteUrl).toString();
  const home = readFileSync(join(root, 'index.html'), 'utf8');
  const robots = readFileSync(join(root, 'robots.txt'), 'utf8');
  const sitemap = readFileSync(join(root, 'sitemap.xml'), 'utf8');
  const failures = [];

  requireText(
    home,
    `<link rel="canonical" href="${normalizedSiteUrl}">`,
    'home canonical',
    failures,
  );
  requireText(
    home,
    `<meta name="robots" content="${indexable ? 'index, follow' : 'noindex, nofollow'}">`,
    'home crawler directive',
    failures,
  );
  requireText(
    sitemap,
    `<loc>${normalizedSiteUrl}</loc>`,
    'sitemap canonical origin',
    failures,
  );

  if (indexable) {
    requireText(robots, 'Allow: /', 'robots policy', failures);
    requireText(
      robots,
      `Sitemap: ${new URL('/sitemap.xml', normalizedSiteUrl).toString()}`,
      'robots sitemap',
      failures,
    );
    if (robots.includes('Disallow: /')) {
      failures.push('robots policy still disallows the indexable artifact');
    }
  } else {
    requireText(robots, 'Disallow: /', 'robots policy', failures);
    if (robots.includes('Sitemap:')) {
      failures.push('fail-closed robots policy must not advertise a sitemap');
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Landing indexing artifact failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`,
    );
  }
}
