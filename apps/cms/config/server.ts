import { validateCmsEnvironment } from './validate-environment';
import type { Core } from '@strapi/strapi';

const config = ({
  env,
}: Core.Config.Shared.ConfigParams): Core.Config.Server => {
  if (env.bool('CMS_VALIDATE_RUNTIME_CONFIG', false)) {
    validateCmsEnvironment(process.env);
  }
  return {
    host: env('HOST', '0.0.0.0'),
    port: env.int('PORT', 1337),
    url: env('PUBLIC_URL', 'http://localhost:1337'),
    app: {
      keys: env.array('APP_KEYS')!,
    },
  };
};

export default config;
