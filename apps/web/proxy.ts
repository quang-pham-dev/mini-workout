import { authConfig } from './auth.config';
import NextAuth, { type NextAuthResult } from 'next-auth';

const authResult: NextAuthResult = NextAuth(authConfig);

export const proxy: NextAuthResult['auth'] = authResult.auth;

export const config = {
  matcher: ['/((?!api/auth|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
