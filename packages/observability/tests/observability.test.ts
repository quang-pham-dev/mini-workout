import { createLogger, redactContext, runHealthChecks } from '../src/index';

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
