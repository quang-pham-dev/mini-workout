import { createHmac } from 'node:crypto';

const previewPaths: Readonly<Record<string, (slug?: string) => string | null>> =
  {
    'api::article.article': (slug) => (slug ? `/articles/${slug}/` : null),
    'api::campaign.campaign': (slug) => (slug ? `/campaigns/${slug}/` : null),
    'api::category.category': (slug) => (slug ? `/movement/${slug}/` : null),
    'api::marketing-page.marketing-page': (slug) => (slug ? `/${slug}/` : null),
    'api::pricing-page.pricing-page': () => '/pricing/',
  };

export function getLandingPreviewPath(
  uid: string,
  slug?: string,
): string | null {
  return previewPaths[uid]?.(slug) ?? null;
}

export function createLandingPreviewUrl(input: {
  previewOrigin: string;
  secret: string;
  path: string;
  status: 'draft' | 'published';
  expires: number;
}): string {
  const payload = `${input.expires}.${input.status}.${input.path}`;
  const signature = createHmac('sha256', input.secret)
    .update(payload)
    .digest('base64url');
  const url = new URL('/api/preview/strapi', input.previewOrigin);
  url.searchParams.set('path', input.path);
  url.searchParams.set('status', input.status);
  url.searchParams.set('expires', String(input.expires));
  url.searchParams.set('signature', signature);
  return url.toString();
}
