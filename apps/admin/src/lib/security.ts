export const securityHeaders = {
  'Cache-Control': 'private, no-store',
  'Content-Security-Policy':
    "default-src 'self'; base-uri 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: https:; font-src 'self' data:; style-src 'self'; script-src 'self' 'unsafe-inline'; connect-src 'self'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
} as const;

export async function withSecurityHeaders<T>(
  next: () => T | Promise<T>,
  setHeader: (name: string, value: string) => void,
): Promise<T> {
  for (const [name, value] of Object.entries(securityHeaders)) {
    setHeader(name, value);
  }
  const result = await next();
  const response =
    result instanceof Response
      ? result
      : result && typeof result === 'object' && 'response' in result
        ? result.response
        : undefined;
  if (response instanceof Response) {
    for (const [name, value] of Object.entries(securityHeaders)) {
      response.headers.set(name, value);
    }
  }
  return result;
}
