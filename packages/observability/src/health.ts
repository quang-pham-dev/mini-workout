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

export async function runHealthChecks(
  checks: HealthCheck[],
): Promise<{ status: HealthStatus; checks: HealthCheckResult[] }> {
  const results = await Promise.all(
    checks.map(async (check): Promise<HealthCheckResult> => {
      const startedAt = performance.now();
      try {
        await check.run();
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
