import type { Core } from '@strapi/strapi';

const allowedMediaTypes = [
  'image/*',
  'video/*',
  'audio/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.*',
  'text/plain',
  'text/csv',
];

const deniedTypes = [
  'image/svg+xml',
  'application/vnd.microsoft.portable-executable',
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-dosexec',
  'application/x-sh',
  'text/x-shellscript',
  'application/x-mach-binary',
];

const config = ({
  env,
}: Core.Config.Shared.ConfigParams): Core.Config.Plugin => ({
  'users-permissions': {
    config: {
      jwtManagement: 'refresh',
      sessions: {
        httpOnly: true,
      },
    },
  },
  upload: {
    config: {
      ...(env('CMS_UPLOAD_PROVIDER', 'local') === 'r2'
        ? {
            provider: 'aws-s3',
            providerOptions: {
              baseUrl: env('R2_PUBLIC_URL'),
              rootPath: env('R2_ROOT_PATH', 'landing'),
              s3Options: {
                credentials: {
                  accessKeyId: env('R2_ACCESS_KEY_ID'),
                  secretAccessKey: env('R2_SECRET_ACCESS_KEY'),
                },
                endpoint: env('R2_ENDPOINT'),
                forcePathStyle: true,
                region: 'auto',
                params: {
                  Bucket: env('R2_BUCKET'),
                },
              },
            },
            actionOptions: {
              upload: {},
              uploadStream: {},
              delete: {},
            },
          }
        : {}),
      security: {
        allowedTypes: allowedMediaTypes,
        deniedTypes,
      },
    },
  },
});

export default config;
