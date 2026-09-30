import { createLandingPreviewUrl, getLandingPreviewPath } from './preview-url';
import type { Core } from '@strapi/strapi';

interface PreviewDocumentReader {
  findOne(input: unknown): Promise<unknown>;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

const config = ({
  env,
}: Core.Config.Shared.ConfigParams): Core.Config.Admin => {
  const previewOrigin = env('LANDING_PREVIEW_URL', 'http://localhost:4321');
  const previewSecret = env('STRAPI_PREVIEW_SECRET');
  return {
    auth: {
      secret: env('ADMIN_JWT_SECRET')!,
    },
    apiToken: {
      salt: env('API_TOKEN_SALT')!,
    },
    transfer: {
      token: {
        salt: env('TRANSFER_TOKEN_SALT')!,
      },
    },
    secrets: {
      encryptionKey: env('ENCRYPTION_KEY')!,
    },
    flags: {
      nps: env.bool('FLAG_NPS', true),
      promoteEE: env.bool('FLAG_PROMOTE_EE', true),
      docLinks: env.bool('FLAG_DOC_LINKS', true),
    },
    preview: {
      enabled: true,
      config: {
        allowedOrigins: [previewOrigin],
        async handler(
          uid: string,
          input: {
            documentId: string;
            locale?: string;
            status?: string;
          },
        ) {
          if (
            !previewSecret ||
            (input.status !== 'draft' && input.status !== 'published')
          )
            return null;
          const status = input.status;
          const documents = strapi.documents(
            uid as never,
          ) as unknown as PreviewDocumentReader;
          const document = asRecord(
            await documents.findOne({
              documentId: input.documentId,
              locale: input.locale,
              status,
            }),
          );
          const path = getLandingPreviewPath(
            uid,
            typeof document?.slug === 'string' ? document.slug : undefined,
          );
          if (!path) return null;
          return createLandingPreviewUrl({
            previewOrigin,
            secret: previewSecret,
            path,
            status,
            expires: Date.now() + 60_000,
          });
        },
      },
    },
  };
};

export default config;
