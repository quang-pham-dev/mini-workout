export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  durationMs: number;
  message?: string;
}

export interface HealthCheck {
  name: string;
  run(): Promise<void>;
}

export interface HealthCheckOptions {
  timeoutMs?: number;
}

async function withTimeout(
  operation: Promise<void>,
  timeoutMs: number,
): Promise<void> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      operation,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(
          () => reject(new Error('Health check timed out')),
          timeoutMs,
        );
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function runHealthChecks(
  checks: HealthCheck[],
  options: HealthCheckOptions = {},
): Promise<{ status: HealthStatus; checks: HealthCheckResult[] }> {
  const timeoutMs = options.timeoutMs ?? 1500;
  const results = await Promise.all(
    checks.map(async (check): Promise<HealthCheckResult> => {
      const startedAt = performance.now();
      try {
        await withTimeout(check.run(), timeoutMs);
        return {
          name: check.name,
          status: 'healthy',
          durationMs: performance.now() - startedAt,
        };
      } catch (error) {
        return {
          name: check.name,
          status: 'unhealthy',
          durationMs: performance.now() - startedAt,
          message:
            error instanceof Error ? error.message : 'Health check failed',
        };
      }
    }),
  );

  return {
    status: results.some((result) => result.status === 'unhealthy')
      ? 'unhealthy'
      : results.some((result) => result.status === 'degraded')
        ? 'degraded'
        : 'healthy',
    checks: results,
  };
}
