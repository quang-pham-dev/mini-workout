import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (_, next) => {
  const response = await next();
  response.headers.set('cache-control', 'private, no-store');
  response.headers.set('x-robots-tag', 'noindex, nofollow');
  return response;
});
