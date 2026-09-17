import {
  AppError,
  classifyError,
  createErrorScope,
  createLogger,
  createLoggerErrorReporter,
  createPostHogServerReporter,
  createReportOnce,
  createRequestContext,
  createWebVitalReporter,
  normalizeError,
  redactContext,
  requestContextHeaders,
  runHealthChecks,
  toPublicError,
} from '../src/index';
import { vi } from 'vitest';

describe('observability primitives', () => {
  it('redacts sensitive context values', () => {
    expect(
      redactContext({
        requestId: 'request-1',
        authorization: 'Bearer secret',
        nested: { apiKey: 'key' },
      }),
    ).toEqual({
      requestId: 'request-1',
      authorization: '[REDACTED]',
      nested: { apiKey: '[REDACTED]' },
    });
  });

  it('emits structured log events through an injected sink', () => {
    const events = [];
    const logger = createLogger({
      service: 'test',
      sink: (event) => events.push(event),
    });

    logger.info('Workout loaded', { requestId: 'request-1' });

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      level: 'info',
      service: 'test',
      message: 'Workout loaded',
      context: { requestId: 'request-1' },
    });
  });

  it('returns unhealthy when a dependency check fails', async () => {
    const result = await runHealthChecks([
      { name: 'database', run: async () => undefined },
      {
        name: 'cache',
        run: async () => {
          throw new Error('cache unavailable');
        },
      },
    ]);

    expect(result.status).toBe('unhealthy');
    expect(result.checks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'cache',
          status: 'unhealthy',
          message: 'cache unavailable',
        }),
      ]),
    );
  });
});

describe('logger', () => {
  it('emits debug, warn, and error log levels', () => {
    const events = [];
    const logger = createLogger({
      service: 'svc',
      sink: (e) => events.push(e),
    });

    logger.debug('debug msg', { x: 1 });
    logger.warn('warn msg');
    logger.error('error msg', new Error('boom'));

    expect(events[0].level).toBe('debug');
    expect(events[1].level).toBe('warn');
    expect(events[2].level).toBe('error');
    expect(events[2].error).toMatchObject({ name: 'Error', message: 'boom' });
  });

  it('attaches error info for non-Error throws', () => {
    const events = [];
    const logger = createLogger({
      service: 'svc',
      sink: (e) => events.push(e),
    });

    logger.error('oops', 'plain string error');
    expect(events[0].error?.message).toBe('plain string error');
  });

  it('child logger inherits and merges parent context', () => {
    const events = [];
    const parent = createLogger({
      service: 'svc',
      context: { traceId: 'abc' },
      sink: (e) => events.push(e),
    });
    const child = parent.child({ userId: 'u1' });
    child.info('child event');

    expect(events[0].context).toMatchObject({ traceId: 'abc', userId: 'u1' });
  });

  it('uses consoleSink by default without throwing', () => {
    const logger = createLogger({ service: 'svc' });
    expect(() => logger.info('hello')).not.toThrow();
    expect(() => logger.warn('warning')).not.toThrow();
    expect(() => logger.error('err', new Error('e'))).not.toThrow();
  });

  it('redacts arrays inside context values', () => {
    const events = [];
    const logger = createLogger({
      service: 'svc',
      sink: (e) => events.push(e),
    });

    logger.info('arr', { data: ['foo', 'bar'] });
    expect(events[0].context?.data).toEqual(['foo', 'bar']);
  });
});

describe('errors', () => {
  it('sends sanitized server error events without blocking the request', () => {
    const fetcher = vi.fn(() => Promise.resolve(new Response('{}')));
    const reporter = createPostHogServerReporter({
      apiKey: 'server-key',
      fetcher,
      host: 'https://posthog.example.test',
    });

    reporter.report({
      error: new Error('database password=secret'),
      context: {
        service: 'web',
        operation: 'profile.load',
        requestId: 'req-1',
        errorCode: 'INTERNAL_ERROR',
        email: 'must-not-send',
      },
    });

    expect(fetcher).toHaveBeenCalledWith(
      'https://posthog.example.test/capture/',
      expect.objectContaining({ method: 'POST' }),
    );
    const body = JSON.parse(fetcher.mock.calls[0]?.[1]?.body as string);
    expect(body.event).toBe('$exception');
    expect(body.properties).toMatchObject({
      service: 'web',
      operation: 'profile.load',
      request_id: 'req-1',
    });
    expect(body.properties.email).toBeUndefined();
    expect(body.properties['$exception_message']).toBeUndefined();
  });
  it('deduplicates reports by key within an injected request scope', () => {
    const report = vi.fn();
    const scope = createErrorScope({ reporter: { report } }, 'request-1');

    expect(
      scope.reportOnce('fingerprint-1', { error: new Error('boom') }),
    ).toBe(true);
    expect(
      scope.reportOnce('fingerprint-1', { error: new Error('boom') }),
    ).toBe(false);
    expect(report).toHaveBeenCalledOnce();
  });

  it('reports an error at most once per boundary instance', () => {
    const report = vi.fn();
    const reporter = createReportOnce({ report });
    const error = new Error('boom');

    reporter.report({ error });
    reporter.report({ error });

    expect(report).toHaveBeenCalledOnce();
  });

  it('creates a stable safe application error contract', () => {
    const error = new AppError({
      code: 'INPUT_INVALID',
      category: 'validation',
      message: 'Invalid input',
      status: 400,
      retryable: false,
      reportable: false,
    });

    expect(error).toMatchObject({
      name: 'AppError',
      code: 'INPUT_INVALID',
      category: 'validation',
      status: 400,
      retryable: false,
      reportable: false,
    });
  });

  it('classifies known errors without reporting expected outcomes', () => {
    const classified = classifyError(
      new AppError({
        code: 'RESOURCE_NOT_FOUND',
        category: 'not_found',
        message: 'Workout not found',
        status: 404,
        retryable: false,
        reportable: false,
      }),
      { service: 'web', operation: 'workout.detail' },
    );

    expect(classified).toMatchObject({
      code: 'RESOURCE_NOT_FOUND',
      publicMessage: 'Workout not found',
      reportable: false,
      fingerprint: expect.any(String),
    });
  });

  it('converts unknown errors to a generic reportable internal error', () => {
    const classified = classifyError(
      new Error('database password=super-secret'),
      { service: 'web', operation: 'profile.load', route: '/profile' },
    );

    expect(classified).toMatchObject({
      code: 'INTERNAL_ERROR',
      category: 'internal',
      publicMessage: 'Something went wrong. Please try again.',
      reportable: true,
      retryable: false,
    });
    expect(classified.fingerprint).not.toContain('super-secret');
    expect(toPublicError(classified)).toEqual({
      code: 'INTERNAL_ERROR',
      message: 'Something went wrong. Please try again.',
      requestId: undefined,
    });
  });

  it('maps dependency failures and groups only dynamic identifiers', () => {
    const first = classifyError(
      Object.assign(new Error('connection failed for workout 123'), {
        code: 'P1001',
      }),
      { service: 'web', operation: 'workout.load' },
    );
    const second = classifyError(
      Object.assign(new Error('connection failed for workout 456'), {
        code: 'P1001',
      }),
      { service: 'web', operation: 'workout.load' },
    );

    expect(first).toMatchObject({
      code: 'DEPENDENCY_UNAVAILABLE',
      category: 'dependency',
      retryable: true,
    });
    expect(first.fingerprint).toBe(second.fingerprint);
  });

  it('recognizes framework control-flow errors and does not classify them', () => {
    const redirectError = Object.assign(new Error('redirect'), {
      digest: 'NEXT_REDIRECT;replace;/login;307;',
    });

    expect(classifyError(redirectError, { service: 'web' }).controlFlow).toBe(
      true,
    );
  });

  it('normalizeError wraps non-Error values', () => {
    expect(normalizeError('string error')).toBeInstanceOf(Error);
    expect(normalizeError('string error').message).toBe('string error');
    expect(normalizeError(42).message).toBe('42');
  });

  it('normalizeError passes Error instances through', () => {
    const err = new Error('original');
    expect(normalizeError(err)).toBe(err);
  });

  it('createLoggerErrorReporter calls logger.error with the error', () => {
    const events = [];
    const logger = createLogger({
      service: 'svc',
      sink: (e) => events.push(e),
    });
    const reporter = createLoggerErrorReporter(logger);

    reporter.report({ error: new Error('crash'), context: { path: '/home' } });

    expect(events).toHaveLength(1);
    expect(events[0].level).toBe('error');
    expect(events[0].error?.message).toBe('crash');
  });
});

describe('tracing', () => {
  it('generates a requestId when no headers are passed', () => {
    const ctx = createRequestContext();
    expect(ctx.requestId).toBeTruthy();
    expect(ctx.traceId).toBeUndefined();
    expect(ctx.parentSpanId).toBeUndefined();
  });

  it('reads x-request-id from headers', () => {
    const headers = new Headers({ 'x-request-id': 'req-123' });
    const ctx = createRequestContext(headers);
    expect(ctx.requestId).toBe('req-123');
  });

  it('parses traceparent header into traceId and parentSpanId', () => {
    const headers = new Headers({
      traceparent: '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01',
    });
    const ctx = createRequestContext(headers);
    expect(ctx.traceId).toBe('4bf92f3577b34da6a3ce929d0e0e4736');
    expect(ctx.parentSpanId).toBe('00f067aa0ba902b7');
  });

  it('rejects malformed correlation headers and generates safe IDs', () => {
    const ctx = createRequestContext(
      new Headers({
        'x-request-id': 'contains spaces and secrets',
        traceparent: '00-invalid-invalid-01',
      }),
    );

    expect(ctx.requestId).toMatch(/^[a-f0-9-]{36}$/);
    expect(ctx.traceId).toBeUndefined();
    expect(ctx.parentSpanId).toBeUndefined();
  });

  it('requestContextHeaders sets x-request-id and optionally x-trace-id', () => {
    const ctxNoTrace = { requestId: 'req-1' };
    const h1 = requestContextHeaders(ctxNoTrace);
    expect(h1.get('x-request-id')).toBe('req-1');
    expect(h1.get('x-trace-id')).toBeNull();

    const ctxWithTrace = { requestId: 'req-2', traceId: 'trace-abc' };
    const h2 = requestContextHeaders(ctxWithTrace);
    expect(h2.get('x-trace-id')).toBe('trace-abc');
  });
});

describe('web vitals', () => {
  it('createWebVitalReporter forwards metric to sink', () => {
    const received = [];
    const reporter = createWebVitalReporter((m) => received.push(m));

    reporter({ name: 'LCP', value: 1200, id: 'v1', rating: 'good' });

    expect(received).toHaveLength(1);
    expect(received[0]).toMatchObject({
      name: 'LCP',
      value: 1200,
      rating: 'good',
    });
  });
});

describe('health checks', () => {
  it('returns healthy when all checks pass', async () => {
    const result = await runHealthChecks([
      { name: 'db', run: async () => undefined },
      { name: 'cache', run: async () => undefined },
    ]);
    expect(result.status).toBe('healthy');
    expect(result.checks.every((c) => c.status === 'healthy')).toBe(true);
  });

  it('reports non-Error throws as a generic message', async () => {
    const result = await runHealthChecks([
      {
        name: 'external',
        run: async () => {
          throw 'string error';
        },
      },
    ]);
    expect(result.checks[0].status).toBe('unhealthy');
    expect(result.checks[0].message).toBe('Health check failed');
  });

  it('records durationMs for each check', async () => {
    const result = await runHealthChecks([
      { name: 'fast', run: async () => undefined },
    ]);
    expect(result.checks[0].durationMs).toBeGreaterThanOrEqual(0);
  });

  it('times out a hung dependency check', async () => {
    const result = await runHealthChecks(
      [{ name: 'database', run: () => new Promise<void>(() => undefined) }],
      { timeoutMs: 5 },
    );
    expect(result.checks[0]).toMatchObject({
      name: 'database',
      status: 'unhealthy',
      message: 'Health check timed out',
    });
  });
});
