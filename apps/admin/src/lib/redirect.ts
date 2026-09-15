const DEFAULT_ADMIN_PATH = '/workouts';

export function safeInternalRedirect(value: unknown): string {
  if (typeof value !== 'string') return DEFAULT_ADMIN_PATH;
  if (!value.startsWith('/') || value.startsWith('//')) {
    return DEFAULT_ADMIN_PATH;
  }

  try {
    const url = new URL(value, 'https://admin.internal');
    return url.origin === 'https://admin.internal'
      ? `${url.pathname}${url.search}${url.hash}`
      : DEFAULT_ADMIN_PATH;
  } catch {
    return DEFAULT_ADMIN_PATH;
  }
}
