import { createLandingServiceObservationRecorder } from '../operations/service-observation-recorder.js';
import { createStrapiPublishWebhookHandler } from './strapi-publish-webhook.js';
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
const handler = createStrapiPublishWebhookHandler({
  deployHookUrl: process.env.VERCEL_DEPLOY_HOOK_URL,
  recorder: createLandingServiceObservationRecorder(logger),
  reporter: createLoggerErrorReporter(logger),
  webhookToken: process.env.STRAPI_WEBHOOK_TOKEN,
});

export const POST: APIRoute = ({ request }) => handler(request);
