import type { MigrationImportPlan } from '../src/migration/import-plan';
import type { MediaResolutionReport } from '../src/migration/media-resolver';
import {
  StrapiApplyError,
  createStrapiApplyClient,
} from '../src/migration/strapi-apply-client';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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
  it('rejects invalid client configuration and mismatched plans', async () => {
    expect(() =>
      createStrapiApplyClient({ apiUrl: 'not-a-url', token, fetcher: vi.fn() }),
    ).toThrowError(expect.objectContaining({ code: 'CONFIG_INVALID' }));
    expect(() =>
      createStrapiApplyClient({
        apiUrl: 'ftp://studio.example.com',
        token,
        fetcher: vi.fn(),
      }),
    ).toThrowError(expect.objectContaining({ code: 'CONFIG_INVALID' }));

    const client = createStrapiApplyClient({
      apiUrl: 'https://studio.example.com',
      token,
      fetcher: vi.fn(),
    });
    await expect(
      client.apply({
        dryRun: true,
        plan: readyPlanWithRevision('first'),
        media: { ...noMedia, planRevision: 'second' },
      }),
    ).rejects.toMatchObject({ code: 'INPUT_INVALID' });
  });

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

  it('uploads a missing checksum exactly once with approved metadata', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cms-apply-upload-'));
    const filePath = join(directory, 'movement.webp');
    await writeFile(filePath, 'webp fixture');
    const checksum = 'b'.repeat(64);
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(response({ data: [] }))
      .mockResolvedValueOnce(
        response([{ id: 42, name: `migration-${checksum}.webp` }], 201),
      );
    const client = createStrapiApplyClient({
      apiUrl: 'https://studio.example.com',
      token,
      fetcher,
    });

    const report = await client.apply({
      dryRun: false,
      media: {
        ...noMedia,
        assets: [
          {
            source: '/movement.webp',
            filePath,
            mimeType: 'image/webp',
            bytes: 12,
            sha256: checksum,
          },
        ],
      },
      plan: plan([
        operation(1, 'media', '/movement.webp', {
          src: '/movement.webp',
          alt: 'Movement',
          caption: 'Gentle movement',
        }),
      ]),
    });

    expect(report.totals).toEqual({
      create: 0,
      update: 0,
      reuse: 0,
      upload: 1,
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1]?.[1]).toMatchObject({
      method: 'POST',
      body: expect.any(FormData),
    });
  });

  it('creates dependency-ordered drafts and maps relations, media, dynamic zones and pricing', async () => {
    const checksum = 'c'.repeat(64);
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        response({
          data: [{ id: 41, name: `migration-${checksum}.webp` }],
        }),
      )
      .mockResolvedValueOnce(response({ data: [] }))
      .mockResolvedValueOnce(
        response({ data: { documentId: 'author-doc' } }, 201),
      )
      .mockResolvedValueOnce(response({ data: [] }))
      .mockResolvedValueOnce(
        response({ data: { documentId: 'category-doc' } }, 201),
      )
      .mockResolvedValueOnce(response({ data: [] }))
      .mockResolvedValueOnce(
        response({ data: { documentId: 'article-doc' } }, 201),
      )
      .mockResolvedValueOnce(response({ data: { documentId: 'pricing-doc' } }))
      .mockResolvedValueOnce(response({ data: { documentId: 'pricing-doc' } }));
    const client = createStrapiApplyClient({
      apiUrl: 'https://studio.example.com',
      token,
      fetcher,
    });
    const image = {
      src: '/movement.webp',
      alt: 'Movement',
      caption: 'Gentle movement',
      width: 1600,
      height: 900,
    };

    const report = await client.apply({
      dryRun: false,
      media: {
        ...noMedia,
        assets: [
          {
            source: image.src,
            filePath: '/unused/movement.webp',
            mimeType: 'image/webp',
            bytes: 10,
            sha256: checksum,
          },
        ],
      },
      plan: plan([
        operation(1, 'media', image.src, image),
        operation(1, 'author', 'Editorial', {
          name: 'Editorial',
          type: 'Organization',
        }),
        operation(2, 'category', 'mobility', {
          _type: 'category',
          schemaVersion: 1,
          slug: 'mobility',
          name: 'Mobility',
          image,
          seo: {
            title: 'Mobility',
            description: 'Move gently.',
            canonicalPath: '/movement/mobility/',
          },
        }),
        operation(3, 'article', 'gentle-mobility', {
          _type: 'article',
          schemaVersion: 1,
          slug: 'gentle-mobility',
          title: 'Gentle mobility',
          category: { slug: 'mobility' },
          author: { name: 'Editorial' },
          image,
          sections: [
            {
              _key: 'section-1',
              _type: 'prose.v1',
              heading: 'Begin',
              paragraphs: ['Move gently.'],
            },
          ],
        }),
        operation(4, 'pricing-page', 'pricing', {
          _type: 'pricingPage',
          schemaVersion: 1,
          plans: [{ _key: 'monthly', planId: 'monthly' }],
        }),
      ]),
    });

    expect(report.totals).toEqual({
      create: 3,
      update: 1,
      reuse: 1,
      upload: 0,
    });
    const categoryBody = JSON.parse(
      String(fetcher.mock.calls[4]?.[1]?.body),
    ) as { data: Record<string, unknown> };
    expect(categoryBody.data).toMatchObject({
      image: { image: 41, alt: 'Movement', caption: 'Gentle movement' },
      seo: { title: 'Mobility', description: 'Move gently.' },
    });
    expect(JSON.stringify(categoryBody)).not.toContain('canonicalPath');

    const articleBody = JSON.parse(
      String(fetcher.mock.calls[6]?.[1]?.body),
    ) as { data: Record<string, unknown> };
    expect(articleBody.data).toMatchObject({
      author: 'author-doc',
      category: 'category-doc',
      sections: [{ __component: 'article.prose-v1', heading: 'Begin' }],
    });

    const pricingBody = JSON.parse(
      String(fetcher.mock.calls[8]?.[1]?.body),
    ) as { data: { plans: Array<Record<string, unknown>> } };
    expect(pricingBody.data.plans).toEqual([
      { planId: 'monthly', enabled: true },
    ]);
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

function readyPlanWithRevision(revision: string): MigrationImportPlan {
  return {
    schemaVersion: 1,
    sourceRevision: 'fixture-v1',
    planRevision: revision,
    readyToApply: true,
    operations: [],
    blockers: [],
  };
}
