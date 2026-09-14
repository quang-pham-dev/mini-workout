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
