import { createEnablePreviewHandler } from './session.js';
import { createClient } from '@sanity/client';
import { validatePreviewUrl } from '@sanity/preview-url-secret';
import type { APIRoute } from 'astro';

const handler = createEnablePreviewHandler({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
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
