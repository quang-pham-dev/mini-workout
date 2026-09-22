import { databaseRunKey } from './database-lock.ts';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export function emailCapturePath(databaseUrl: string): string {
  return join(
    tmpdir(),
    `mini-workout-e2e-email-${databaseRunKey(databaseUrl)}.jsonl`,
  );
}
