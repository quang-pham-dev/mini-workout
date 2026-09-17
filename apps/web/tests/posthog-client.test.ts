import { createPostHogAdapter } from '@/lib/observability/posthog-client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

function sdk() {
  const captureException = vi.fn();
  return {
    init: vi.fn(),
    captureException,
    identify: vi.fn(),
    reset: vi.fn(),
  };
}

describe('PostHog error adapter', () => {
  beforeEach(() => vi.stubGlobal('window', {}));
  afterEach(() => vi.unstubAllGlobals());

  it('does not initialize or capture when no public key is configured', () => {
    const client = sdk();
    const adapter = createPostHogAdapter(client, undefined);

    adapter.captureException(new Error('boom'), {
      error_code: 'INTERNAL_ERROR',
      unsafe: 'must be removed',
    });

    expect(client.init).not.toHaveBeenCalled();
    expect(client.captureException).not.toHaveBeenCalled();
  });

  it('initializes once with automatic exception and console capture disabled', () => {
    const client = sdk();
    const adapter = createPostHogAdapter(client, 'phc_test');

    adapter.captureException(new Error('boom'), {
      error_code: 'INTERNAL_ERROR',
      operation: 'workout.load',
      request_id: 'req-1',
      unsafe: 'must be removed',
    });
    adapter.captureException(new Error('again'));

    expect(client.init).toHaveBeenCalledOnce();
    expect(client.init).toHaveBeenCalledWith(
      'phc_test',
      expect.objectContaining({
        capture_unhandled_errors: false,
        capture_console_errors: false,
        autocapture: false,
      }),
    );
    expect(client.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        error_code: 'INTERNAL_ERROR',
        operation: 'workout.load',
        request_id: 'req-1',
      }),
    );
    expect(client.captureException.mock.calls[0]?.[1]).not.toHaveProperty(
      'unsafe',
    );
  });

  it('identifies and resets only through the configured adapter', () => {
    const client = sdk();
    const adapter = createPostHogAdapter(client, 'phc_test');

    adapter.identify('user-123');
    adapter.reset();

    expect(client.identify).toHaveBeenCalledWith('user-123');
    expect(client.reset).toHaveBeenCalledOnce();
  });
});
