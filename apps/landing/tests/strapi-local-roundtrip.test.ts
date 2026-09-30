import { comparePublishedContentSnapshots } from '../src/content/content-parity.js';
import { createPublishedContentRepository } from '../src/content/published-content-repository.js';
import {
  createLocalStrapiSnapshot,
  startLocalStrapiSnapshotServer,
} from './support/local-strapi-snapshot-server.js';
import { afterEach, describe, expect, it } from 'vitest';

describe('local Strapi snapshot round trip', () => {
  let close: (() => Promise<void>) | undefined;

  afterEach(async () => {
    await close?.();
    close = undefined;
  });

  it('preserves Landing semantics through the authenticated snapshot boundary', async () => {
    const expected = await createPublishedContentRepository({
      contentSource: 'fixtures',
    }).load();
    const rehearsal = createLocalStrapiSnapshot(expected);
    const server = await startLocalStrapiSnapshotServer({
      token: 'local-roundtrip-token',
      snapshot: rehearsal.transport,
    });
    close = server.close;

    const actual = await createPublishedContentRepository({
      contentSource: 'strapi',
      strapiApiUrl: server.apiUrl,
      strapiApiReadToken: 'local-roundtrip-token',
    }).load();

    expect(
      comparePublishedContentSnapshots(rehearsal.expected, actual),
    ).toEqual({ ok: true, issues: [] });
    expect(server.requests()).toEqual({
      authorized: 1,
      unauthorized: 0,
      preview: 0,
    });
  });

  it('rejects an invalid token without returning content', async () => {
    const expected = await createPublishedContentRepository({
      contentSource: 'fixtures',
    }).load();
    const rehearsal = createLocalStrapiSnapshot(expected);
    const server = await startLocalStrapiSnapshotServer({
      token: 'local-roundtrip-token',
      snapshot: rehearsal.transport,
    });
    close = server.close;

    await expect(
      createPublishedContentRepository({
        contentSource: 'strapi',
        strapiApiUrl: server.apiUrl,
        strapiApiReadToken: 'wrong-token',
      }).load(),
    ).rejects.toMatchObject({ code: 'DEPENDENCY_UNAVAILABLE' });
    expect(server.requests()).toEqual({
      authorized: 0,
      unauthorized: 1,
      preview: 0,
    });
  });
});
