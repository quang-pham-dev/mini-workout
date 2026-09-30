import type { MigrationImportPlan } from '../src/migration/import-plan';
import type { MediaResolutionReport } from '../src/migration/media-resolver';
import { createStrapiApplyClient } from '../src/migration/strapi-apply-client';
import { startLocalStrapiRehearsalServer } from './support/local-strapi-rehearsal-server';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

const token = 'local-rehearsal-token';
const servers: Array<{ close(): Promise<void> }> = [];

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()));
});

describe('Strapi migration local HTTP rehearsal', () => {
  it('applies twice without creating duplicate media, collections or singletons', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cms-local-rehearsal-'));
    const filePath = join(directory, 'movement.webp');
    await writeFile(filePath, 'local rehearsal media');
    const server = await startLocalStrapiRehearsalServer({ token });
    servers.push(server);
    const client = createStrapiApplyClient({
      apiUrl: server.apiUrl,
      token,
    });
    const plan = rehearsalPlan();
    const media = rehearsalMedia(filePath);

    const first = await client.apply({ dryRun: false, plan, media });
    const afterFirst = server.snapshot();
    const second = await client.apply({ dryRun: false, plan, media });
    const afterSecond = server.snapshot();

    expect(first.totals).toEqual({
      create: 3,
      update: 0,
      reuse: 0,
      upload: 1,
    });
    expect(second.totals).toEqual({
      create: 0,
      update: 3,
      reuse: 1,
      upload: 0,
    });
    expect(afterSecond.counts).toEqual(afterFirst.counts);
    expect(afterSecond.counts).toEqual({
      media: 1,
      authors: 1,
      categories: 1,
      pricingPage: 1,
    });
    expect(afterSecond.unauthorizedRequests).toBe(0);
    expect(afterSecond.publishedWrites).toBe(0);
  });

  it('rejects the wrong token without mutating local state', async () => {
    const server = await startLocalStrapiRehearsalServer({ token });
    servers.push(server);
    const client = createStrapiApplyClient({
      apiUrl: server.apiUrl,
      token: 'wrong-token',
    });

    await expect(
      client.apply({
        dryRun: true,
        plan: {
          ...rehearsalPlan(),
          operations: [rehearsalPlan().operations[1]!],
        },
        media: { ...rehearsalMedia('/unused'), assets: [] },
      }),
    ).rejects.toMatchObject({ code: 'DEPENDENCY_UNAVAILABLE' });
    expect(server.snapshot().counts.authors).toBe(0);
    expect(server.snapshot().unauthorizedRequests).toBe(1);
  });
});

function rehearsalPlan(): MigrationImportPlan {
  return {
    schemaVersion: 1,
    sourceRevision: 'local-rehearsal-v1',
    planRevision: 'local-plan-v1',
    readyToApply: true,
    blockers: [],
    operations: [
      {
        phase: 1,
        kind: 'media',
        key: '/movement.webp',
        payload: {
          src: '/movement.webp',
          alt: 'Synthetic rehearsal movement',
          caption: 'Not production content',
        },
        references: [],
      },
      {
        phase: 1,
        kind: 'author',
        key: 'Local rehearsal author',
        payload: { name: 'Local rehearsal author', type: 'Organization' },
        references: [],
      },
      {
        phase: 2,
        kind: 'category',
        key: 'local-rehearsal',
        payload: {
          schemaVersion: 1,
          slug: 'local-rehearsal',
          name: 'Local rehearsal',
        },
        references: [],
      },
      {
        phase: 4,
        kind: 'pricing-page',
        key: 'pricing',
        payload: {
          schemaVersion: 1,
          title: 'Synthetic pricing contract rehearsal',
          plans: [{ planId: 'synthetic-only', enabled: true }],
        },
        references: [],
      },
    ],
  };
}

function rehearsalMedia(filePath: string): MediaResolutionReport {
  return {
    schemaVersion: 1,
    planRevision: 'local-plan-v1',
    readyToApply: true,
    issues: [],
    remainingBlockers: [],
    assets: [
      {
        source: '/movement.webp',
        filePath,
        mimeType: 'image/webp',
        bytes: 21,
        sha256:
          'd44d3f2a5ff678966d24dbe32a4f17eef66c1d06f9b9c59011e09fbd7309b611',
      },
    ],
  };
}
