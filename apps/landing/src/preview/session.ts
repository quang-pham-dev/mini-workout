export const previewCookieName = 'sanity-preview-perspective';

interface PreviewValidationResult {
  isValid: boolean;
  redirectTo?: string;
  studioPreviewPerspective?: string | null;
}

type PreviewValidator = (
  previewUrl: string,
) => Promise<PreviewValidationResult>;

interface PreviewHandlerDependencies {
  projectId?: string;
  dataset?: string;
  token?: string;
  createValidator: (config: {
    projectId: string;
    dataset: string;
    token: string;
  }) => PreviewValidator;
}

const privateNoStoreHeaders = {
  'cache-control': 'private, no-store',
  'x-robots-tag': 'noindex, nofollow',
} as const;

function safeRedirectPath(value: string | undefined): string {
  if (
    !value ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) {
    return '/';
  }
  return value;
}

function previewCookie(value: string, maxAge: number): string {
  return [
    `${previewCookieName}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${maxAge}`,
    'Secure',
    'SameSite=Lax',
  ].join('; ');
}

export function createEnablePreviewHandler(
  dependencies: PreviewHandlerDependencies,
): (request: Request) => Promise<Response> {
  return async (request) => {
    const { projectId, dataset, token } = dependencies;
    if (!projectId || !dataset || !token) {
      return new Response('Preview is unavailable.', {
        status: 503,
        headers: privateNoStoreHeaders,
      });
    }

    try {
      const validate = dependencies.createValidator({
        projectId,
        dataset,
        token,
      });
      const result = await validate(request.url);
      if (!result.isValid) {
        return new Response('Preview authorization failed.', {
          status: 401,
          headers: privateNoStoreHeaders,
        });
      }

      const perspective = result.studioPreviewPerspective || 'drafts';
      return new Response(null, {
        status: 307,
        headers: {
          ...privateNoStoreHeaders,
          location: safeRedirectPath(result.redirectTo),
          'set-cookie': previewCookie(perspective, 60 * 60),
        },
      });
    } catch {
      return new Response('Preview is temporarily unavailable.', {
        status: 503,
        headers: privateNoStoreHeaders,
      });
    }
  };
}

export function createDisablePreviewResponse(): Response {
  return new Response(null, {
    status: 307,
    headers: {
      ...privateNoStoreHeaders,
      location: '/',
      'set-cookie': previewCookie('', 0),
    },
  });
}

export function getPreviewState(request: Request): {
  enabled: boolean;
  noindex: true;
} {
  const cookie = request.headers.get('cookie') ?? '';
  const enabled = cookie
    .split(';')
    .some((part) => part.trim().startsWith(`${previewCookieName}=`));
  return { enabled, noindex: true };
}
