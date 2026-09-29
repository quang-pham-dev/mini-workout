import { createLandingServiceObservationRecorder } from '../operations/service-observation-recorder.js';
import { createPublishWebhookHandler } from './publish-webhook.js';
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
const reporter = createLoggerErrorReporter(logger);
const handler = createPublishWebhookHandler({
  deployHookUrl: process.env.VERCEL_DEPLOY_HOOK_URL,
  recorder: createLandingServiceObservationRecorder(logger),
  reporter,
  webhookSecret: process.env.SANITY_WEBHOOK_SECRET,
});

export const POST: APIRoute = ({ request }) => handler(request);
