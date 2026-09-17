import { reportAdminServerFunctionError } from '@/lib/observability/server-function-error';
import { AppError } from '@mini-workout/observability';
import { describe, expect, it, vi } from 'vitest';

describe('admin server-function error boundary', () => {
  it('does not report expected authorization failures', () => {
    const reporter = { report: vi.fn() };

    const classified = reportAdminServerFunctionError(
      new AppError({
        code: 'ADMIN_REQUIRED',
        category: 'authorization',
        message: 'Admin role required',
        status: 403,
        retryable: false,
        reportable: false,
      }),
      'admin.workouts.list',
      reporter,
    );

    expect(classified.reportable).toBe(false);
    expect(reporter.report).not.toHaveBeenCalled();
  });

  it('reports unexpected failures with admin operation context', () => {
    const reporter = { report: vi.fn() };

    const classified = reportAdminServerFunctionError(
      new Error('database unavailable'),
      'admin.workouts.list',
      reporter,
    );

    expect(classified.code).toBe('INTERNAL_ERROR');
    expect(reporter.report).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          service: 'admin',
          operation: 'admin.workouts.list',
          errorCode: 'INTERNAL_ERROR',
        }),
      }),
    );
  });
});
