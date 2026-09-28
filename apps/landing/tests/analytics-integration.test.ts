import { analyticsIntegration } from '../analytics-integration.mjs';
import { describe, expect, it, vi } from 'vitest';

describe('Landing analytics integration', () => {
  it('keeps the static artifact script-free when analytics is disabled', () => {
    const injectScript = vi.fn();

    analyticsIntegration(false).hooks['astro:config:setup']({ injectScript });

    expect(injectScript).not.toHaveBeenCalled();
  });

  it('injects the consent-gated entry only when explicitly enabled', () => {
    const injectScript = vi.fn();

    analyticsIntegration(true).hooks['astro:config:setup']({ injectScript });

    expect(injectScript).toHaveBeenCalledWith(
      'page',
      `import '/src/analytics/landing-entry.ts';`,
    );
  });
});
