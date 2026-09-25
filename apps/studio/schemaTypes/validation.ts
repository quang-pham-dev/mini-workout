export function validateSlug(value: unknown): boolean {
  const slug =
    typeof value === 'string'
      ? value
      : typeof value === 'object' &&
          value !== null &&
          'current' in value &&
          typeof value.current === 'string'
        ? value.current
        : '';
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

export function validateInternalHref(value: unknown): boolean {
  if (typeof value !== 'string') return false;
  if (!value.startsWith('/') || value.startsWith('//')) return false;
  if (value.includes('?') || value.includes('\\')) return false;

  const [pathname = '', fragment, extra] = value.split('#');
  if (extra !== undefined) return false;
  if (fragment !== undefined && !/^[a-zA-Z][\w-]*$/.test(fragment)) {
    return false;
  }

  return pathname
    .split('/')
    .every(
      (segment) =>
        segment.length === 0 ||
        (/^[a-zA-Z0-9_-]+$/.test(segment) &&
          segment !== '.' &&
          segment !== '..'),
    );
}
