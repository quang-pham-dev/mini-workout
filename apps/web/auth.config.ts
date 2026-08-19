import { getSafeRedirectPath, isProtectedPath } from './lib/auth/authorization';
import type { NextAuthConfig } from 'next-auth';

export const authConfig = {
  providers: [],
  pages: {
    signIn: '/login',
  },
  callbacks: {
    authorized({ auth, request }) {
      const pathname = request.nextUrl.pathname;

      if (!isProtectedPath(pathname)) {
        return true;
      }

      if (auth?.user) {
        return true;
      }

      const loginUrl = new URL('/login', request.nextUrl.origin);
      loginUrl.searchParams.set(
        'callbackUrl',
        getSafeRedirectPath(`${pathname}${request.nextUrl.search}`),
      );
      return Response.redirect(loginUrl);
    },
  },
} satisfies NextAuthConfig;
