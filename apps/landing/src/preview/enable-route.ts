import { createLandingServiceObservationRecorder } from '../operations/service-observation-recorder.js';
import { createEnablePreviewHandler } from './session.js';
import {
  createLogger,
  createLoggerErrorReporter,
} from '@mini-workout/observability';
import { createClient } from '@sanity/client';
import { validatePreviewUrl } from '@sanity/preview-url-secret';
import type { APIRoute } from 'astro';

const logger = createLogger({
  service: 'landing',
  context: {
    environment: process.env.VERCEL_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA,
  },
});
const handler = createEnablePreviewHandler({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  recorder: createLandingServiceObservationRecorder(logger),
  reporter: createLoggerErrorReporter(logger),
  token: process.env.SANITY_API_READ_TOKEN,
  createValidator:
    ({ projectId, dataset, token }) =>
    async (previewUrl) => {
      const client = createClient({
        projectId,
        dataset,
        token,
        apiVersion: '2026-09-24',
        perspective: 'raw',
        useCdn: false,
      });
      return validatePreviewUrl(client, previewUrl);
    },
});

export const GET: APIRoute = ({ request }) => handler(request);
