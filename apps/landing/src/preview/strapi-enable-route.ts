import { createStrapiPreviewHandler } from './strapi-session.js';
import {
  createLogger,
  createLoggerErrorReporter,
} from '@mini-workout/observability';
import type { APIRoute } from 'astro';

const logger = createLogger({
  service: 'landing',
  context: {
    environment: process.env.VERCEL_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
  },
});
const handler = createStrapiPreviewHandler({
  reporter: createLoggerErrorReporter(logger),
  secret: process.env.STRAPI_PREVIEW_SECRET,
});

export const GET: APIRoute = ({ request }) => handler(request);
