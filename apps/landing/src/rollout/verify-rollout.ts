export type RolloutObservation = Readonly<{
  path: string;
  status: number;
  canonical?: string;
  robots?: string;
  headers: Readonly<Record<string, string>>;
}>;

export type RolloutIssue = Readonly<{
  code:
    | 'canonical'
    | 'missing_path'
    | 'robots'
    | 'security_headers'
    | 'sitemap_extra'
    | 'sitemap_missing'
    | 'status';
  path: string;
}>;

export type RolloutVerificationInput = Readonly<{
  origin: string;
  indexable: boolean;
  expectedPaths: readonly string[];
  sitemapPaths: readonly string[];
  observations: readonly RolloutObservation[];
}>;

export type RolloutSitemap = Readonly<{
  origin: string;
  paths: readonly string[];
}>;

export function rolloutRequestHeaders(
  bypassSecret: string | undefined,
): Readonly<Record<string, string>> {
  if (bypassSecret === undefined || bypassSecret.length === 0) return {};
  if (!/^[A-Za-z0-9_-]{16,512}$/.test(bypassSecret)) {
    throw new Error('ROLLOUT_BYPASS_SECRET_INVALID');
  }
  return { 'x-vercel-protection-bypass': bypassSecret };
}

export function parseRolloutSitemap(xml: string): RolloutSitemap {
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(
    (match) => new URL(match[1]!),
  );
  if (urls.length === 0) throw new Error('ROLLOUT_SITEMAP_EMPTY');
  const origin = urls[0]!.origin;
  if (
    urls.some(
      (url) =>
        url.protocol !== 'https:' ||
        url.origin !== origin ||
        url.search.length > 0 ||
        url.hash.length > 0,
    )
  ) {
    throw new Error('ROLLOUT_SITEMAP_ORIGIN');
  }
  return { origin: `${origin}/`, paths: urls.map((url) => url.pathname) };
}

export function parseRolloutHtml(html: string): Readonly<{
  canonical?: string;
  robots?: string;
}> {
  const readAttribute = (element: 'link' | 'meta', name: string) => {
    const candidates =
      html.match(new RegExp(`<${element}\\b[^>]*>`, 'gi')) ?? [];
    for (const candidate of candidates) {
      const attributes = Object.fromEntries(
        [...candidate.matchAll(/([\w-]+)=["']([^"']*)["']/g)].map((match) => [
          match[1]!.toLowerCase(),
          match[2]!,
        ]),
      );
      if (attributes.rel === name || attributes.name === name) {
        return attributes.href ?? attributes.content;
      }
    }
    return undefined;
  };
  return {
    canonical: readAttribute('link', 'canonical'),
    robots: readAttribute('meta', 'robots'),
  };
}

const requiredSecurityHeaders = [
  'content-security-policy',
  'permissions-policy',
  'referrer-policy',
  'strict-transport-security',
  'x-content-type-options',
];

function normalizedHeaders(
  headers: Readonly<Record<string, string>>,
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
}

function canonicalFor(origin: URL, path: string): string {
  return new URL(path, origin).toString();
}

export function validateRolloutObservations(
  input: RolloutVerificationInput,
): readonly RolloutIssue[] {
  const origin = new URL(input.origin);
  if (
    !['http:', 'https:'].includes(origin.protocol) ||
    origin.origin + '/' !== origin.toString()
  ) {
    throw new Error('Rollout origin must be an HTTP(S) origin.');
  }
  const observations = new Map(
    input.observations.map((observation) => [observation.path, observation]),
  );
  const sitemapPaths = new Set(input.sitemapPaths);
  const expectedPaths = new Set(input.expectedPaths);
  const issues: RolloutIssue[] = [];

  for (const path of expectedPaths) {
    const observation = observations.get(path);
    if (!observation) {
      issues.push({ code: 'missing_path', path });
      continue;
    }
    if (observation.status !== 200) issues.push({ code: 'status', path });
    if (observation.canonical !== canonicalFor(origin, path)) {
      issues.push({ code: 'canonical', path });
    }
    const robots = observation.robots?.toLowerCase() ?? '';
    if (
      (input.indexable && !robots.includes('index, follow')) ||
      (!input.indexable && !robots.includes('noindex'))
    ) {
      issues.push({ code: 'robots', path });
    }
    const headers = normalizedHeaders(observation.headers);
    if (requiredSecurityHeaders.some((header) => !headers[header])) {
      issues.push({ code: 'security_headers', path });
    }
    if (!sitemapPaths.has(path)) {
      issues.push({ code: 'sitemap_missing', path });
    }
  }

  for (const path of sitemapPaths) {
    if (!expectedPaths.has(path)) issues.push({ code: 'sitemap_extra', path });
  }
  return issues;
}
