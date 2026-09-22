export function getAuthErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;

  const value = error as {
    body?: { code?: unknown };
    code?: unknown;
  };

  if (typeof value.body?.code === 'string') return value.body.code;
  return typeof value.code === 'string' ? value.code : undefined;
}
