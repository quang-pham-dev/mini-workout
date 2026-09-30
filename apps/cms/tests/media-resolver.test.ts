import { resolveMigrationMedia } from '../src/migration/media-resolver';
import { mkdir, symlink, writeFile } from 'node:fs/promises';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

function plan(...sources: string[]) {
  return {
    schemaVersion: 1 as const,
    sourceRevision: 'fixture-v1',
    planRevision: 'plan-v1',
    readyToApply: false,
    operations: sources.map((source) => ({
      phase: 1 as const,
      kind: 'media' as const,
      key: source,
      payload: {},
      references: [],
    })),
    blockers: sources.map((source) => ({
      code: 'MEDIA_BINARY_REQUIRED' as const,
      path: source,
    })),
  };
}

describe('migration media resolver', () => {
  it('produces deterministic metadata for supported local media', async () => {
    const root = await mkdtemp(join(tmpdir(), 'cms-media-'));
    await mkdir(join(root, 'images'));
    await writeFile(join(root, 'images', 'movement.webp'), 'webp fixture');

    const report = await resolveMigrationMedia(
      plan('/images/movement.webp'),
      root,
    );

    expect(report).toMatchObject({
      readyToApply: true,
      issues: [],
      remainingBlockers: [],
      assets: [
        {
          source: '/images/movement.webp',
          mimeType: 'image/webp',
          bytes: 12,
        },
      ],
    });
    expect(report.assets[0]?.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it('rejects traversal, missing files, unsupported types and escaping symlinks', async () => {
    const parent = await mkdtemp(join(tmpdir(), 'cms-media-boundary-'));
    const root = join(parent, 'public');
    await mkdir(root);
    await writeFile(join(root, 'notes.txt'), 'not media');
    await writeFile(join(parent, 'outside.webp'), 'outside');
    await symlink(join(parent, 'outside.webp'), join(root, 'escape.webp'));

    const report = await resolveMigrationMedia(
      plan('/../outside.webp', '/missing.webp', '/notes.txt', '/escape.webp'),
      root,
    );

    expect(report.readyToApply).toBe(false);
    expect(report.issues).toEqual([
      { code: 'MEDIA_PATH_INVALID', path: '/../outside.webp' },
      { code: 'MEDIA_FILE_MISSING', path: '/missing.webp' },
      { code: 'MEDIA_TYPE_UNSUPPORTED', path: '/notes.txt' },
      { code: 'MEDIA_PATH_INVALID', path: '/escape.webp' },
    ]);
  });
});
