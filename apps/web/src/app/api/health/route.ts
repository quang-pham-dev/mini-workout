import { prisma } from '@mini-workout/database';
import {
  createLogger,
  createRequestContext,
  runHealthChecks,
} from '@mini-workout/observability';
import { NextResponse } from 'next/server';

const logger = createLogger({ service: 'web' });

export async function GET(request: Request) {
  const requestContext = createRequestContext(request.headers);
  const result = await runHealthChecks(
    [
      { name: 'application', run: async () => undefined },
      {
        name: 'database',
        run: async () => {
          await prisma.$queryRaw`SELECT 1`;
        },
      },
    ],
    { timeoutMs: 1500 },
  );

  logger.info('Health check completed', {
    requestId: requestContext.requestId,
    status: result.status,
  });

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
