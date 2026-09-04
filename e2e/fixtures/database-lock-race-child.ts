import { acquireDatabaseLock } from './database-lock.ts';
import { existsSync } from 'node:fs';

const environment = process.env as Record<string, string | undefined>;
while (!existsSync(environment.LOCK_BARRIER ?? '')) {
  await new Promise((resolve) => setTimeout(resolve, 1));
}
const lock = acquireDatabaseLock(
  'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e',
  environment.LOCK_DIRECTORY,
);
process.stdout.write(lock.token);
