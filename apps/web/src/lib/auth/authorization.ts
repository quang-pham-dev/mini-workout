const protectedPrefixes = [
  '/home',
  '/favourites',
  '/profile',
  '/onboarding',
  '/workouts',
];
const fallbackPath = '/home';

/**
 * Routes that authenticated users should never see.
 * /verify-email is intentionally excluded: a logged-in user may still
 * need to confirm their address before certain features unlock.
 */
const authOnlyPrefixes = [
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
];

export function isProtectedPath(pathname: string) {
  return protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Returns true when the pathname is a guest-only auth page (login, register,
 * forgot-password, reset-password). Authenticated users are redirected away
 * from these routes to avoid confusion.
 */
export function isAuthPath(pathname: string) {
  return authOnlyPrefixes.some(
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
