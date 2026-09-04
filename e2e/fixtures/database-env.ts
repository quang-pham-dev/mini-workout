const approvedHosts = new Set(['127.0.0.1', '[::1]', 'localhost']);
const approvedDatabaseNames = new Set([
  'e2e',
  'mini_workout_e2e',
  'mini_workout_test',
  'test',
]);

export function assertTestDatabase(databaseUrl: string): void {
  try {
    const url = new URL(databaseUrl);
    const databaseName = decodeURIComponent(url.pathname.slice(1));

    if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !approvedHosts.has(url.hostname) ||
      !approvedDatabaseNames.has(databaseName)
    ) {
      throw new Error('not approved');
    }
  } catch {
    throw new Error('E2E setup requires a disposable test database');
  }
}

export function resolveDatabaseUrl(env: NodeJS.ProcessEnv): string {
  const e2eDatabaseUrl = env.E2E_DATABASE_URL;
  const databaseUrl = env.DATABASE_URL;

  if (!e2eDatabaseUrl || !databaseUrl) {
    throw new Error(
      'E2E setup requires both E2E_DATABASE_URL and DATABASE_URL to be set',
    );
  }

  if (e2eDatabaseUrl !== databaseUrl) {
    throw new Error('E2E_DATABASE_URL and DATABASE_URL must match');
  }

  assertTestDatabase(databaseUrl);
  return canonicalDatabaseUrl(databaseUrl);
}

export function canonicalDatabaseUrl(databaseUrl: string): string {
  const url = new URL(databaseUrl);
  url.searchParams.sort();
  url.hash = '';
  return url.toString();
}
