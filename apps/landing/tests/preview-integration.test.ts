import { previewIntegration } from '../preview-integration.mjs';
import { describe, expect, it, vi } from 'vitest';

function runSetup(enabled: boolean) {
  const injectRoute = vi.fn();
  const addMiddleware = vi.fn();
  const injectScript = vi.fn();
  previewIntegration(enabled).hooks['astro:config:setup']({
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
});
