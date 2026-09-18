import { pingDatabase } from '@mini-workout/database';
import {
  createRequestContext,
  getObservability,
  runHealthChecks,
} from '@mini-workout/observability';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestContext = createRequestContext(request.headers);
  const result = await runHealthChecks(
    [{ name: 'database', run: pingDatabase }],
    { timeoutMs: 1500 },
  );

  try {
    getObservability().logger.info('Health check completed', {
      requestId: requestContext.requestId,
      status: result.status,
    });
  } catch {
    // Telemetry must never replace the health response.
  }

  return NextResponse.json(
    {
      ...result,
      requestId: requestContext.requestId,
      timestamp: new Date().toISOString(),
    },
    {
      status: result.status === 'healthy' ? 200 : 503,
      headers: {
        'cache-control': 'no-store',
        'x-request-id': requestContext.requestId,
      },
    },
  );
}
