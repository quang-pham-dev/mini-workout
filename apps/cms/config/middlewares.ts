import type { Core } from '@strapi/strapi';

function mediaOrigin(value: string | undefined): string[] {
  if (!value) return [];
  try {
    return [new URL(value).origin];
  } catch {
    return [];
  }
}

const config = ({
  env,
}: Core.Config.Shared.ConfigParams): Core.Config.Middlewares => [
  'strapi::logger',
  'strapi::errors',
  {
    name: 'strapi::security',
    config: {
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          'connect-src': ["'self'", 'https:'],
          'img-src': [
            "'self'",
            'data:',
            'blob:',
            'market-assets.strapi.io',
            ...mediaOrigin(env('R2_PUBLIC_URL')),
          ],
          'media-src': [
            "'self'",
            'data:',
            'blob:',
            ...mediaOrigin(env('R2_PUBLIC_URL')),
          ],
          upgradeInsecureRequests: null,
        },
      },
    },
  },
  'strapi::cors',
  'strapi::poweredBy',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];

export default config;
