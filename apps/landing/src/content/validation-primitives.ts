export interface ContentContractIssue {
  code: string;
  path: string;
}

export type ContentMappingResult<T> =
  { ok: true; value: T } | { ok: false; issues: ContentContractIssue[] };

export interface LocalMedia {
  src: string;
  alt: string;
  width: number;
  height: number;
  caption: string;
}

export interface InternalLink {
  label: string;
  href: string;
}

export interface SeoValue<CanonicalPath extends string> {
  title: string;
  description: string;
  canonicalPath: CanonicalPath;
}

export class ContentContractError extends Error {
  readonly issues: readonly ContentContractIssue[];

  constructor(
    documentType: string,
    issues: readonly ContentContractIssue[],
    documentIndex: number,
  ) {
    super(
      `Published ${documentType} ${documentIndex} violates the content contract: ${issues
        .map((issue) => issue.code)
        .join(', ')}`,
    );
    this.name = 'ContentContractError';
    this.issues = issues;
  }
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function requiredString(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: ContentContractIssue[],
): string {
  const value = record[key];
  if (typeof value === 'string' && value.trim().length > 0) {
    return value.trim();
  }
  issues.push({ code: key, path });
  return '';
}

export function requiredRecord(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: ContentContractIssue[],
): Record<string, unknown> {
  const value = record[key];
  if (isRecord(value)) return value;
  issues.push({ code: key, path });
  return {};
}

export function positiveInteger(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: ContentContractIssue[],
): number {
  const value = record[key];
  if (Number.isInteger(value) && Number(value) > 0) return Number(value);
  issues.push({ code: key, path });
  return 0;
}

export function mapSlug(
  record: Record<string, unknown>,
  key: string,
  path: string,
  issues: ContentContractIssue[],
  options: { reserved?: readonly string[] } = {},
): string {
  const slug = requiredString(record, key, path, issues);
  const isNormalized = /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
  const isReserved = options.reserved?.includes(slug) ?? false;
  if ((!isNormalized || isReserved) && slug.length > 0) {
    issues.push({ code: 'slug', path });
  }
  return slug;
}

function isSafeInternalPath(href: string): boolean {
  if (!href.startsWith('/') || href.startsWith('//')) return false;
  if (href.includes('?') || href.includes('\\')) return false;

  const [pathname, fragment, extra] = href.split('#');
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

export function mapInternalLink(
  input: unknown,
  path: string,
  issues: ContentContractIssue[],
): InternalLink {
  if (!isRecord(input)) {
    issues.push({ code: 'internal_link', path });
    return { label: '', href: '' };
  }
  const label = requiredString(input, 'label', `${path}.label`, issues);
  const href = requiredString(input, 'href', `${path}.href`, issues);
  if (href.length > 0 && !isSafeInternalPath(href)) {
    issues.push({ code: 'internal_link_href', path: `${path}.href` });
  }
  return { label, href };
}

export function mapLocalMedia(
  input: unknown,
  path: string,
  issues: ContentContractIssue[],
): LocalMedia {
  if (!isRecord(input)) {
    issues.push({ code: 'media', path });
    return { src: '', alt: '', width: 0, height: 0, caption: '' };
  }
  const src = requiredString(input, 'src', `${path}.src`, issues);
  if (
    src.length > 0 &&
    !/^\/images\/[a-zA-Z0-9/_-]+\.(?:avif|webp|png|jpe?g)$/.test(src) &&
    !/^https:\/\/cdn\.sanity\.io\/images\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+\/[a-zA-Z0-9._-]+$/.test(
      src,
    )
  ) {
    issues.push({ code: 'media_src', path: `${path}.src` });
  }
  return {
    src,
    alt: requiredString(input, 'alt', `${path}.alt`, issues),
    width: positiveInteger(input, 'width', `${path}.width`, issues),
    height: positiveInteger(input, 'height', `${path}.height`, issues),
    caption: requiredString(input, 'caption', `${path}.caption`, issues),
  };
}

export function mapSeo<CanonicalPath extends string>(
  input: unknown,
  path: string,
  canonicalPath: CanonicalPath,
  issues: ContentContractIssue[],
): SeoValue<CanonicalPath> {
  if (!isRecord(input)) {
    issues.push({ code: 'seo', path });
    return { title: '', description: '', canonicalPath };
  }
  return {
    title: requiredString(input, 'title', `${path}.title`, issues),
    description: requiredString(
      input,
      'description',
      `${path}.description`,
      issues,
    ),
    canonicalPath,
  };
}
