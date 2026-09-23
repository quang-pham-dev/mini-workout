const protectedPrefixes = [
  '/home',
  '/favourites',
  '/profile',
  '/onboarding',
  '/workouts',
];
const fallbackPath = '/home';

export function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function getSafeRedirectPath(value: string | null | undefined) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return fallbackPath;
  }

  return value;
}

/**
 * Builds the canonical login redirect used by both the edge guard and the
 * server-side session guard. A missing pathname intentionally falls back to a
 * plain login URL because there is no safe destination to preserve.
 */
export function getLoginRedirectPath(pathname: string | null | undefined) {
  if (!pathname) return '/login';

  const callbackUrl = getSafeRedirectPath(pathname);
  return `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`;
}
