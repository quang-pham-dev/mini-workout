import { presentationLocations } from './presentation.js';
import { parsePreviewUrl } from './preview-url.js';
import { schemaTypes } from './schemaTypes/index.js';
import { singletonDocumentTypes, studioStructure } from './structure.js';
import { visionTool } from '@sanity/vision';
import { defineConfig } from 'sanity';
import { presentationTool } from 'sanity/presentation';
import { structureTool } from 'sanity/structure';

const previewUrl = parsePreviewUrl(process.env.SANITY_STUDIO_PREVIEW_URL);

export default defineConfig({
  name: 'default',
  title: 'Mini Workout Studio',
  projectId:
    process.env.SANITY_PROJECT_ID ??
    process.env.SANITY_STUDIO_PROJECT_ID ??
    'offlineplaceholder',
  dataset:
    process.env.SANITY_DATASET ??
    process.env.SANITY_STUDIO_DATASET ??
    'production',
  plugins: [
    structureTool({ structure: studioStructure }),
    presentationTool({
      previewUrl: {
        initial: previewUrl.href,
        previewMode: {
          enable: '/api/draft-mode/enable/',
          shareAccess: false,
        },
      },
      allowOrigins: [previewUrl.origin],
      resolve: { locations: presentationLocations },
    }),
    visionTool(),
  ],
  schema: { types: schemaTypes },
  document: {
    newDocumentOptions: (previous) =>
      previous.filter(
        (template) =>
          !singletonDocumentTypes.includes(
            template.templateId as (typeof singletonDocumentTypes)[number],
          ),
      ),
  },
});
