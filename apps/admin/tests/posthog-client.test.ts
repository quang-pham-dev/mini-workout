import { createPostHogAdapter } from '@/lib/observability/posthog-client';
import { beforeEach, describe, expect, it, vi } from 'vitest';

function sdk() {
  return {
    init: vi.fn(),
    captureException: vi.fn(),
    identify: vi.fn(),
    reset: vi.fn(),
  };
}

describe('admin PostHog adapter', () => {
  beforeEach(() => vi.stubGlobal('window', {}));

  it('captures only allowlisted error metadata', () => {
    const client = sdk();
    const adapter = createPostHogAdapter(client, 'phc_test');

    adapter.captureException(new Error('admin failure'), {
      error_code: 'INTERNAL_ERROR',
      service: 'admin',
      operation: 'admin.workouts.list',
      password: 'never-send',
    });

    expect(client.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        error_code: 'INTERNAL_ERROR',
        service: 'admin',
        operation: 'admin.workouts.list',
      }),
    );
    expect(client.captureException.mock.calls[0]?.[1]).not.toHaveProperty(
      'password',
    );
  });
});
