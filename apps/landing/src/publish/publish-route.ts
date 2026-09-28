import { createPublishWebhookHandler } from './publish-webhook.js';
import {
  createLogger,
  createLoggerErrorReporter,
} from '@mini-workout/observability';
import type { APIRoute } from 'astro';

const reporter = createLoggerErrorReporter(
  createLogger({ service: 'landing' }),
);
const handler = createPublishWebhookHandler({
  deployHookUrl: process.env.VERCEL_DEPLOY_HOOK_URL,
  reporter,
  webhookSecret: process.env.SANITY_WEBHOOK_SECRET,
});

export const POST: APIRoute = ({ request }) => handler(request);
