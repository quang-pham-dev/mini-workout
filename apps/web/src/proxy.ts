import { getSafeRedirectPath, isProtectedPath } from '@/lib/auth/authorization';
import { getSessionCookie } from 'better-auth/cookies';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (!isProtectedPath(pathname) || getSessionCookie(request)) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set(
    'callbackUrl',
    getSafeRedirectPath(`${pathname}${request.nextUrl.search}`),
  );

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
