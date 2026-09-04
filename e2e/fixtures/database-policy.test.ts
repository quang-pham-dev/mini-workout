import { assertTestDatabase, resolveDatabaseUrl } from './database-env.ts';
import { strict as assert } from 'node:assert';
import test from 'node:test';

test('rejects an e2e-named database on a production-looking host', () => {
  assert.throws(() =>
    assertTestDatabase(
      'postgresql://user:password@prod-db.example.com:5432/mini_workout_e2e',
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
