import { createApiErrorResponse } from '@/lib/observability/api-error';
import { AppError } from '@mini-workout/observability';
import { describe, expect, it, vi } from 'vitest';

const request = (requestId?: string) =>
  new Request('http://localhost/api/example', {
    headers: requestId ? { 'x-request-id': requestId } : undefined,
  });

describe('Web API error boundary', () => {
  it('returns a safe typed response for expected errors without reporting', async () => {
    const reporter = { report: vi.fn() };
    const response = createApiErrorResponse(
      new AppError({
        code: 'RESOURCE_NOT_FOUND',
        category: 'not_found',
        message: 'Workout not found',
        status: 404,
        retryable: false,
        reportable: false,
      }),
      request('req-expected'),
      'workout.detail',
      reporter,
    );

    expect(response.status).toBe(404);
    expect(response.headers.get('x-request-id')).toBe('req-expected');
    expect(await response.json()).toEqual({
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: 'Workout not found',
        requestId: 'req-expected',
      },
    });
    expect(reporter.report).not.toHaveBeenCalled();
  });

  it('reports unknown failures and never exposes the original message', async () => {
    const reporter = { report: vi.fn() };
    const response = createApiErrorResponse(
      new Error('password=secret database failure'),
      request(),
      'workout.like.update',
      reporter,
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get('x-request-id')).toBeTruthy();
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.message).toBe('Something went wrong. Please try again.');
    expect(JSON.stringify(body)).not.toContain('secret');
    expect(reporter.report).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.any(Error),
        context: expect.objectContaining({
          service: 'web',
          operation: 'workout.like.update',
        }),
      }),
    );
  });
});
