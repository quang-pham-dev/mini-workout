import { projectDefinitions, publicServerEnv } from '../playwright.config.ts';
import { strict as assert } from 'node:assert';
import test from 'node:test';

test('always exposes a public project and sanitizes its server environment', () => {
  assert.equal(
    projectDefinitions({}).some(({ name }) => name === 'public'),
    true,
  );
  const env = publicServerEnv({
    DATABASE_URL: 'postgresql://real.example/db',
    E2E_DATABASE_URL: 'postgresql://real.example/db',
    BETTER_AUTH_SECRET: 'production-secret',
  });

  assert.notEqual(env.DATABASE_URL, 'postgresql://real.example/db');
  assert.equal(env.E2E_DATABASE_URL, '');
  assert.notEqual(env.BETTER_AUTH_SECRET, 'production-secret');
});

test('gates database projects on both matching database variables', () => {
  const databaseUrl =
    'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e';
  assert.deepEqual(
    projectDefinitions({ E2E_DATABASE_URL: databaseUrl }).map(
      ({ name }) => name,
    ),
    ['public'],
  );
  assert.deepEqual(
    projectDefinitions({ DATABASE_URL: databaseUrl }).map(({ name }) => name),
    ['public'],
  );
  assert.deepEqual(
    projectDefinitions({
      E2E_DATABASE_URL: databaseUrl,
      DATABASE_URL: databaseUrl,
    }).map(({ name }) => name),
    ['public', 'db-setup', 'db'],
  );
});
