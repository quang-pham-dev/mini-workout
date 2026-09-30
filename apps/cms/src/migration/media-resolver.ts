import type { MigrationImportPlan } from './import-plan';
import { createHash } from 'node:crypto';
import { readFile, realpath, stat } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';

const maximumMediaBytes = 20 * 1024 * 1024;
const mimeTypes = new Map([
  ['.avif', 'image/avif'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
]);

export interface ResolvedMigrationMedia {
  readonly source: string;
  readonly filePath: string;
  readonly mimeType: string;
  readonly bytes: number;
  readonly sha256: string;
}

export interface MediaResolutionIssue {
  readonly code:
    | 'MEDIA_PATH_INVALID'
    | 'MEDIA_FILE_MISSING'
    | 'MEDIA_TYPE_UNSUPPORTED'
    | 'MEDIA_FILE_TOO_LARGE';
  readonly path: string;
}

export interface MediaResolutionReport {
  readonly schemaVersion: 1;
  readonly planRevision: string;
  readonly readyToApply: boolean;
  readonly assets: readonly ResolvedMigrationMedia[];
  readonly issues: readonly MediaResolutionIssue[];
  readonly remainingBlockers: MigrationImportPlan['blockers'];
}

function isInside(root: string, candidate: string): boolean {
  const path = relative(root, candidate);
  return path.length > 0 && path !== '..' && !path.startsWith(`..${sep}`);
}

async function resolveAsset(
  root: string,
  source: string,
): Promise<ResolvedMigrationMedia | MediaResolutionIssue> {
  if (!source.startsWith('/') || source.includes('?') || source.includes('#')) {
    return { code: 'MEDIA_PATH_INVALID', path: source };
  }
  const candidate = resolve(root, `.${source}`);
  if (!isInside(root, candidate)) {
    return { code: 'MEDIA_PATH_INVALID', path: source };
  }

  let canonicalPath: string;
  try {
    canonicalPath = await realpath(candidate);
  } catch {
    return { code: 'MEDIA_FILE_MISSING', path: source };
  }
  if (!isInside(root, canonicalPath)) {
    return { code: 'MEDIA_PATH_INVALID', path: source };
  }

  const mimeType = mimeTypes.get(extname(canonicalPath).toLowerCase());
  if (!mimeType) return { code: 'MEDIA_TYPE_UNSUPPORTED', path: source };

  const metadata = await stat(canonicalPath);
  if (!metadata.isFile()) {
    return { code: 'MEDIA_FILE_MISSING', path: source };
  }
  if (metadata.size > maximumMediaBytes) {
    return { code: 'MEDIA_FILE_TOO_LARGE', path: source };
  }
  const content = await readFile(canonicalPath);
  return {
    source,
    filePath: canonicalPath,
    mimeType,
    bytes: metadata.size,
    sha256: createHash('sha256').update(content).digest('hex'),
  };
}

export async function resolveMigrationMedia(
  plan: MigrationImportPlan,
  sourceRoot: string,
): Promise<MediaResolutionReport> {
  const root = await realpath(sourceRoot);
  const sources = plan.operations
    .filter(({ kind }) => kind === 'media')
    .map(({ key }) => key);
  const results = await Promise.all(
    sources.map((source) => resolveAsset(root, source)),
  );
  const assets = results.filter(
    (result): result is ResolvedMigrationMedia => 'sha256' in result,
  );
  const issues = results.filter(
    (result): result is MediaResolutionIssue => 'code' in result,
  );
  const remainingBlockers = plan.blockers.filter(
    ({ code }) => code !== 'MEDIA_BINARY_REQUIRED',
  );

  return {
    schemaVersion: 1,
    planRevision: plan.planRevision,
    readyToApply: issues.length === 0 && remainingBlockers.length === 0,
    assets,
    issues,
    remainingBlockers,
  };
}
