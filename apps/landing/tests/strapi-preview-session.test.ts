import {
  createStrapiPreviewHandler,
  signStrapiPreviewRequest,
} from '../src/preview/strapi-session.js';
import { describe, expect, it, vi } from 'vitest';

const now = 1_800_000_000_000;
const secret = 'shared-preview-secret';

function previewUrl(
  overrides: Partial<{
    path: string;
    status: 'draft' | 'published';
    expires: number;
  }> = {},
) {
  const path = overrides.path ?? '/movement/mobility/';
  const status = overrides.status ?? 'draft';
  const expires = overrides.expires ?? now + 60_000;
  const signature = signStrapiPreviewRequest({ secret, path, status, expires });
  const url = new URL('https://preview.example.com/api/preview/strapi');
  url.searchParams.set('path', path);
  url.searchParams.set('status', status);
  url.searchParams.set('expires', String(expires));
  url.searchParams.set('signature', signature);
  return url;
}

describe('Strapi preview session', () => {
  it('sets a signed, HttpOnly draft session and redirects internally', async () => {
    const response = await createStrapiPreviewHandler({
      secret,
      now: () => now,
    })(new Request(previewUrl()));

    expect(response.status).toBe(307);
    expect(response.headers.get('x-request-id')).toMatch(/^[a-f0-9-]{36}$/);
    expect(response.headers.get('location')).toBe('/movement/mobility/');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
    expect(response.headers.get('set-cookie')).toContain(
      'strapi-preview-perspective=draft',
    );
  });

  it('reports invalid deployment configuration once without exposing details', async () => {
    const reporter = { report: vi.fn() };
    const response = await createStrapiPreviewHandler({ reporter })(
      new Request(previewUrl()),
    );

    expect(response.status).toBe(503);
    expect(await response.text()).toBe('Preview is unavailable.');
    expect(reporter.report).toHaveBeenCalledTimes(1);
  });

  it('rejects tampering, expiration and unsafe redirects', async () => {
    const handler = createStrapiPreviewHandler({ secret, now: () => now });
    const tampered = previewUrl();
    tampered.searchParams.set('path', '//attacker.example');

    expect((await handler(new Request(tampered))).status).toBe(401);
    expect(
      (await handler(new Request(previewUrl({ expires: now - 1 })))).status,
    ).toBe(401);
  });

  it('clears draft state when previewing the published perspective', async () => {
    const response = await createStrapiPreviewHandler({
      secret,
      now: () => now,
    })(new Request(previewUrl({ status: 'published' })));

    expect(response.status).toBe(307);
    expect(response.headers.get('set-cookie')).toContain('Max-Age=0');
  });
});
