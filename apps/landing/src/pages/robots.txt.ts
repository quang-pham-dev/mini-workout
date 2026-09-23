import type { APIRoute } from 'astro';

export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL(
    '/sitemap.xml',
    site ?? 'https://example.com',
  ).toString();
  // Vite defines this boolean from the validated Vercel build environment.
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  const body = !import.meta.env.LANDING_INDEXABLE
    ? 'User-agent: *\nDisallow: /\n'
    : `User-agent: *\nAllow: /\nSitemap: ${sitemap}\n`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
