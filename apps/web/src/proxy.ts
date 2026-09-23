import {
  getLoginRedirectPath,
  isProtectedPath,
} from '@/lib/auth/authorization';
import {
  ONBOARDING_COOKIE_NAME,
  ONBOARDING_COOKIE_VALUES,
  SESSION_COOKIE_NAME,
} from '@/lib/auth/constants';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const { pathname, searchParams } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (isProtectedPath(pathname) && !hasSession) {
    return NextResponse.redirect(
      new URL(
        getLoginRedirectPath(`${pathname}${request.nextUrl.search}`),
        request.url,
      ),
    );
  }

  // Optimistic edge guard for onboarding to eliminate layout flash
  if (hasSession) {
    const onboardedValue = request.cookies.get(ONBOARDING_COOKIE_NAME)?.value;
    const isOnboardingRoute = pathname === '/onboarding';

    // Check if the user is explicitly trying to edit their profile
    const isEditMode = searchParams.get('mode') === 'edit';

    const needsOnboarding =
      onboardedValue === ONBOARDING_COOKIE_VALUES.IN_PROGRESS;

    // If they haven't completed required steps, force them to onboarding
    if (needsOnboarding && isProtectedPath(pathname) && !isOnboardingRoute) {
      return NextResponse.redirect(new URL('/onboarding', request.url));
    }

    // If they HAVE completed required steps and are trying to access /onboarding
    // WITHOUT the edit mode flag, redirect them to home
    const hasCompletedRequired =
      onboardedValue === ONBOARDING_COOKIE_VALUES.REQUIRED_DONE ||
      onboardedValue === ONBOARDING_COOKIE_VALUES.COMPLETED;

    if (
      hasCompletedRequired &&
      isOnboardingRoute &&
      !isEditMode &&
      !searchParams.has('step')
    ) {
      return NextResponse.redirect(new URL('/home', request.url));
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-pathname', `${pathname}${request.nextUrl.search}`);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
