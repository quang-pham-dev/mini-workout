export type LandingSecurityPolicyInput = Readonly<{
  mode: 'public' | 'preview';
  analytics: Readonly<{ enabled: boolean; host: string }>;
  studioOrigin?: string;
  sanityProjectId?: string;
}>;

export type LandingSecurityHeaders = Readonly<Record<string, string>>;

function normalizedOrigin(value: string, label: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch (cause) {
    throw new Error(`${label} must be a valid HTTP(S) origin.`, { cause });
  }
  if (
    !['http:', 'https:'].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.pathname !== '/' ||
    url.search ||
    url.hash
  ) {
    throw new Error(`${label} must be a valid HTTP(S) origin.`);
  }
  return url.origin;
}

export function createLandingSecurityHeaders(
  input: LandingSecurityPolicyInput,
): LandingSecurityHeaders {
  const analyticsOrigin = input.analytics.enabled
    ? normalizedOrigin(input.analytics.host, 'Analytics host')
    : undefined;
  const studioOrigin =
    input.mode === 'preview' && input.studioOrigin
      ? normalizedOrigin(input.studioOrigin, 'Studio origin')
      : undefined;
  if (input.mode === 'preview' && !studioOrigin) {
    throw new Error('Preview security policy requires a Studio origin.');
  }

  const connectSources = ["'self'"];
  if (analyticsOrigin) connectSources.push(analyticsOrigin);
  if (input.mode === 'preview' && input.sanityProjectId) {
    if (!/^[a-z0-9-]+$/.test(input.sanityProjectId)) {
      throw new Error(
        'Preview security policy received an invalid project ID.',
      );
    }
    connectSources.push(
      `https://${input.sanityProjectId}.api.sanity.io`,
      `wss://${input.sanityProjectId}.api.sanity.io`,
    );
  }

  const directives = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    `frame-ancestors ${studioOrigin ?? "'none'"}`,
    "form-action 'self'",
    "img-src 'self' data: https://cdn.sanity.io",
    "font-src 'self' data:",
    `style-src 'self'${input.mode === 'preview' ? " 'unsafe-inline'" : ''}`,
    "script-src 'self' 'unsafe-inline'",
    `connect-src ${connectSources.join(' ')}`,
    "manifest-src 'self'",
    "media-src 'self'",
    "worker-src 'self' blob:",
    'upgrade-insecure-requests',
  ];

  return {
    'Content-Security-Policy': directives.join('; '),
    'Permissions-Policy':
      'camera=(), geolocation=(), microphone=(), payment=(), usb=()',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Strict-Transport-Security': 'max-age=31536000',
    'X-Content-Type-Options': 'nosniff',
    ...(input.mode === 'public' ? { 'X-Frame-Options': 'DENY' } : {}),
  };
}
