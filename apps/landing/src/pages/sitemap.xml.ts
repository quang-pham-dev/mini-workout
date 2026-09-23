import { sitemapXml } from '../lib/seo/index.js';
import type { APIRoute } from 'astro';

const indexablePaths = ['/'] as const;

export const GET: APIRoute = ({ site }) => {
  const body = sitemapXml(
    site?.toString() ?? 'https://example.com/',
    indexablePaths,
  );

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
