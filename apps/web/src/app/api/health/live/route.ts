import { runHealthChecks } from '@mini-workout/observability';
import { NextResponse } from 'next/server';

export async function GET() {
  const result = await runHealthChecks([
    { name: 'application', run: async () => undefined },
  ]);

  return NextResponse.json(result, {
    status: 200,
    headers: { 'cache-control': 'no-store' },
  });
}
