import { withServerActionErrorBoundary } from '@/lib/observability/action-error';
import { describe, expect, it, vi } from 'vitest';

describe('Web Server Action error boundary', () => {
  it('reports unexpected errors once and preserves the original error', async () => {
    const reporter = { report: vi.fn() };
    const error = new Error('database unavailable');

    await expect(
      withServerActionErrorBoundary(
        'workout.favorite.toggle',
        async () => {
          throw error;
        },
        {
          reporter,
          createContext: async (operation) => ({
            service: 'web',
            operation,
            requestId: 'req-1',
          }),
        },
      ),
    ).rejects.toBe(error);

    expect(reporter.report).toHaveBeenCalledOnce();
  });

  it('does not report framework control flow', async () => {
    const reporter = { report: vi.fn() };
    const redirectError = Object.assign(new Error('redirect'), {
      digest: 'NEXT_REDIRECT;replace;/login;307;',
    });

    await expect(
      withServerActionErrorBoundary(
        'auth.login',
        async () => {
          throw redirectError;
        },
        { reporter, createContext: async () => ({ service: 'web' }) },
      ),
    ).rejects.toBe(redirectError);

    expect(reporter.report).not.toHaveBeenCalled();
  });
});
