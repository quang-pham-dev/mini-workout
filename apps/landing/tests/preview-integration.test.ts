import { previewIntegration } from '../preview-integration.mjs';
import { describe, expect, it, vi } from 'vitest';

function runSetup(enabled: boolean, contentSource = 'sanity') {
  const injectRoute = vi.fn();
  const addMiddleware = vi.fn();
  const injectScript = vi.fn();
  previewIntegration(enabled, contentSource).hooks['astro:config:setup']({
    addMiddleware,
    injectRoute,
    injectScript,
  });
  return { addMiddleware, injectRoute, injectScript };
}

describe('preview-only integration', () => {
  it('does not expose draft or publishing routes in the static artifact', () => {
    const hooks = runSetup(false);

    expect(hooks.injectRoute).not.toHaveBeenCalled();
    expect(hooks.addMiddleware).not.toHaveBeenCalled();
    expect(hooks.injectScript).not.toHaveBeenCalled();
  });

  it('injects the authenticated publishing boundary only in the preview artifact', () => {
    const { injectRoute } = runSetup(true);

    expect(injectRoute.mock.calls.map(([route]) => route.pattern)).toEqual([
      '/api/draft-mode/enable',
      '/api/draft-mode/disable',
      '/api/webhooks/sanity/publish',
    ]);
    expect(
      injectRoute.mock.calls.find(
        ([route]) => route.pattern === '/api/webhooks/sanity/publish',
      )?.[0],
    ).toMatchObject({ prerender: false });
  });

  it('injects Strapi preview without Sanity routes or visual editing', () => {
    const hooks = runSetup(true, 'strapi');

    expect(
      hooks.injectRoute.mock.calls.map(([route]) => route.pattern),
    ).toEqual([
      '/api/preview/strapi',
      '/api/webhooks/strapi/publish',
      '/api/draft-mode/disable',
    ]);
    expect(hooks.injectScript).not.toHaveBeenCalled();
  });
});
