import type { MigrationImportPlan } from '../src/migration/import-plan';
import type { MediaResolutionReport } from '../src/migration/media-resolver';
import {
  StrapiApplyError,
  createStrapiApplyClient,
} from '../src/migration/strapi-apply-client';
import { describe, expect, it, vi } from 'vitest';

const token = 'migration-token-must-never-appear';

function plan(
  operations: MigrationImportPlan['operations'],
): MigrationImportPlan {
  return {
    schemaVersion: 1,
    sourceRevision: 'fixture-v1',
    planRevision: 'plan-v1',
    readyToApply: true,
    operations,
    blockers: [],
  };
}

const noMedia: MediaResolutionReport = {
  schemaVersion: 1,
  planRevision: 'plan-v1',
  readyToApply: true,
  assets: [],
  issues: [],
  remainingBlockers: [],
};

function response(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('Strapi migration apply client', () => {
  it('dry-runs deterministic creates and updates without a write request', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({ data: [] }))
      .mockResolvedValueOnce(
        response({ data: [{ documentId: 'existing-category' }] }),
      )
      .mockResolvedValueOnce(response({ data: null }, 404));
    const client = createStrapiApplyClient({
      apiUrl: 'https://studio.example.com',
      token,
      fetcher,
    });

    const report = await client.apply({
      dryRun: true,
      media: noMedia,
      plan: plan([
        operation(1, 'author', 'Editorial', { name: 'Editorial' }),
        operation(2, 'category', 'mobility', { slug: 'mobility' }),
        operation(4, 'site-settings', 'site-settings', {
          schemaVersion: 1,
          brandName: 'Mini Workout',
        }),
      ]),
    });

    expect(report).toMatchObject({
      mode: 'dry-run',
      totals: { create: 2, update: 1, reuse: 0, upload: 0 },
      actions: [
        { kind: 'author', key: 'Editorial', action: 'create' },
        { kind: 'category', key: 'mobility', action: 'update' },
        { kind: 'site-settings', key: 'site-settings', action: 'create' },
      ],
    });
    expect(fetcher).toHaveBeenCalledTimes(3);
    expect(fetcher.mock.calls.every(([, init]) => init?.method === 'GET')).toBe(
      true,
    );
  });

  it('reuses media by full checksum name and upserts collections by documentId', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        response({
          data: [{ id: 41, name: `migration-${'a'.repeat(64)}.webp` }],
        }),
      )
      .mockResolvedValueOnce(
        response({ data: [{ documentId: 'author-document' }] }),
      )
      .mockResolvedValueOnce(
        response({ data: { documentId: 'author-document' } }),
      );
    const client = createStrapiApplyClient({
      apiUrl: 'https://studio.example.com/',
      token,
      fetcher,
    });

    const report = await client.apply({
      dryRun: false,
      media: {
        ...noMedia,
        assets: [
          {
            source: '/image.webp',
            filePath: '/unused/image.webp',
            mimeType: 'image/webp',
            bytes: 10,
            sha256: 'a'.repeat(64),
          },
        ],
      },
      plan: plan([
        operation(1, 'media', '/image.webp', {
          src: '/image.webp',
          alt: 'Movement',
          caption: 'Gentle movement',
        }),
        operation(1, 'author', 'Editorial', { name: 'Editorial' }),
      ]),
    });

    expect(report.totals).toEqual({
      create: 0,
      update: 1,
      reuse: 1,
      upload: 0,
    });
    const write = fetcher.mock.calls[2];
    expect(String(write?.[0])).toContain('/api/authors/author-document');
    expect(write?.[1]?.method).toBe('PUT');
    expect(write?.[1]?.headers).toMatchObject({
      Authorization: `Bearer ${token}`,
    });
  });

  it('rejects duplicate stable keys before writing', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      response({
        data: [{ documentId: 'first' }, { documentId: 'second' }],
      }),
    );
    const client = createStrapiApplyClient({
      apiUrl: 'https://studio.example.com',
      token,
      fetcher,
    });

    await expect(
      client.apply({
        dryRun: false,
        media: noMedia,
        plan: plan([
          operation(1, 'author', 'Editorial', { name: 'Editorial' }),
        ]),
      }),
    ).rejects.toMatchObject({ code: 'RESOURCE_CONFLICT' });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it('maps upstream failures to a stable sanitized dependency error', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        response({ error: { message: `provider failed using ${token}` } }, 503),
      );
    const client = createStrapiApplyClient({
      apiUrl: 'https://studio.example.com',
      token,
      fetcher,
    });

    const error = await client
      .apply({
        dryRun: true,
        media: noMedia,
        plan: plan([
          operation(1, 'author', 'Editorial', { name: 'Editorial' }),
        ]),
      })
      .catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(StrapiApplyError);
    expect(error).toMatchObject({ code: 'DEPENDENCY_UNAVAILABLE' });
    expect(String(error)).not.toContain(token);
  });
});

function operation(
  phase: 1 | 2 | 3 | 4,
  kind: MigrationImportPlan['operations'][number]['kind'],
  key: string,
  payload: Record<string, unknown>,
): MigrationImportPlan['operations'][number] {
  return { phase, kind, key, payload, references: [] };
}
