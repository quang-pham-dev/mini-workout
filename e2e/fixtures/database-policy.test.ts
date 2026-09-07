import { assertTestDatabase, resolveDatabaseUrl } from './database-env.ts';
import { strict as assert } from 'node:assert';
import test from 'node:test';

for (const url of [
  'postgresql://localhost:0/test',
  'postgresql://localhost/test?host=remote.example',
  'postgresql://localhost/test?hostaddr=192.0.2.1',
  'postgresql://localhost/test?port=5433',
  'postgresql://localhost/test?dbname=production',
  'postgresql://localhost/test?database=production',
]) {
  test(`rejects endpoint overrides or invalid ports: ${url}`, () => {
    assert.throws(() => assertTestDatabase(url), /disposable/);
  });
}

test('rejects an e2e-named database on a production-looking host', () => {
  assert.throws(() =>
    assertTestDatabase(
      'postgresql://user:password@prod-db.example.com:5432/mini_workout_e2e',
    ),
  );
});

test('accepts a disposable database on the normalized IPv6 loopback host', () => {
  assert.doesNotThrow(() =>
    assertTestDatabase(
      'postgresql://user:password@[::1]:5432/mini_workout_e2e',
    ),
  );
});

test('requires matching database environment variables', () => {
  assert.equal(
    resolveDatabaseUrl({
      E2E_DATABASE_URL:
        'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e',
      DATABASE_URL:
        'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e',
    }),
    'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e',
  );
  assert.throws(
    () =>
      resolveDatabaseUrl({
        E2E_DATABASE_URL:
          'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e',
        DATABASE_URL:
          'postgresql://user:password@127.0.0.1:5432/mini_workout_test',
      }),
    /must match/,
  );
});

test('rejects a missing E2E_DATABASE_URL', () => {
  assert.throws(
    () =>
      resolveDatabaseUrl({
        DATABASE_URL:
          'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e',
      }),
    /both.*required|E2E_DATABASE_URL/i,
  );
});

test('rejects a missing DATABASE_URL', () => {
  assert.throws(
    () =>
      resolveDatabaseUrl({
        E2E_DATABASE_URL:
          'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e',
      }),
    /both.*required|DATABASE_URL/i,
  );
});

test('limits cleanup to the three exercised fixture users', async () => {
  const { cleanupUserWhere, fixtureUserWhere } = await import('./database.ts');
  assert.deepEqual(fixtureUserWhere, {
    email: {
      in: [
        'active-user@example.test',
        'empty-user@example.test',
        'new-user@example.test',
      ],
    },
  });
  assert.deepEqual(cleanupUserWhere(['exact@example.test']), {
    email: {
      in: [
        'active-user@example.test',
        'empty-user@example.test',
        'new-user@example.test',
        'exact@example.test',
      ],
    },
  });
});
