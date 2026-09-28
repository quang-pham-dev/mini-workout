import {
  type AnalyticsClient,
  createNoopAnalytics,
  createPostHogBrowserAdapter,
} from '../src';
import { describe, expect, it, vi } from 'vitest';

describe('analytics contracts', () => {
  it('provides a safe no-op client', () => {
    const client = createNoopAnalytics();

    expect(() => {
      client.capture('test_event', { safe: true });
      client.captureException(new Error('ignored'));
      client.identify('user-1');
      client.reset();
    }).not.toThrow();
  });

  it('sanitizes browser exception properties before forwarding them', () => {
    const sdk = {
      init: vi.fn(),
      capture: vi.fn(),
      captureException: vi.fn(),
      identify: vi.fn(),
      reset: vi.fn(),
    };
    const client = createPostHogBrowserAdapter(sdk, 'public-key');
    const previousWindow = globalThis.window;
    Object.assign(globalThis, { window: {} });

    client.initialize();
    client.captureException(new Error('private'), {
      error_code: 'INTERNAL_ERROR',
      email: 'must-not-send',
      request_id: 'request-1',
    });

    expect(sdk.captureException).toHaveBeenCalledWith(expect.any(Error), {
      error_code: 'INTERNAL_ERROR',
      request_id: 'request-1',
    });
    const [sanitizedError] = sdk.captureException.mock.calls[0]!;
    expect(sanitizedError.message).toBe('INTERNAL_ERROR');
    expect(sanitizedError.message).not.toContain('private');
    Object.assign(globalThis, { window: previousWindow });
  });

  it('keeps provider failures from changing the application response', () => {
    const client: AnalyticsClient = createPostHogBrowserAdapter(
      {
        init: () => {
          throw new Error('provider unavailable');
        },
        capture: () => {
          throw new Error('provider unavailable');
        },
        captureException: () => {
          throw new Error('provider unavailable');
        },
        identify: () => {
          throw new Error('provider unavailable');
        },
        reset: () => {
          throw new Error('provider unavailable');
        },
      },
      'public-key',
    );
    const previousWindow = globalThis.window;
    Object.assign(globalThis, { window: {} });

    expect(() => {
      client.initialize();
      client.capture('event');
      client.captureException(new Error('app error'));
      client.identify('user-1');
      client.reset();
    }).not.toThrow();
    Object.assign(globalThis, { window: previousWindow });
  });

  it('forwards typed product properties and rejects invalid product payloads', () => {
    const sdk = {
      init: vi.fn(),
      capture: vi.fn(),
      captureException: vi.fn(),
      identify: vi.fn(),
      reset: vi.fn(),
    };
    const client = createPostHogBrowserAdapter(sdk, 'public-key');
    const previousWindow = globalThis.window;
    Object.assign(globalThis, { window: {} });

    client.capture('cta_clicked', {
      route_template: '/',
      cta_id: 'header-login',
      destination_app: 'member',
      action: 'login',
      placement: 'header',
      email: 'private@example.test',
    });
    client.capture('cta_clicked', { route_template: '/' });

    expect(sdk.capture).toHaveBeenCalledTimes(1);
    expect(sdk.capture).toHaveBeenCalledWith('cta_clicked', {
      route_template: '/',
      cta_id: 'header-login',
      destination_app: 'member',
      action: 'login',
      placement: 'header',
    });
    Object.assign(globalThis, { window: previousWindow });
  });
});
