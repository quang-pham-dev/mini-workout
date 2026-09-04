import { assertTestDatabase } from './database.ts';
import { strict as assert } from 'node:assert';
import test from 'node:test';

test('rejects an e2e-named database on a production-looking host', () => {
  assert.throws(() =>
    assertTestDatabase(
      'postgresql://user:password@prod-db.example.com:5432/mini_workout_e2e',
    ),
  );
});
