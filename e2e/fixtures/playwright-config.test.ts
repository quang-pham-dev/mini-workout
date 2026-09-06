import {
  databaseBaseURL,
  databaseServerEnv,
  projectDefinitions,
  publicBaseURL,
  publicServerEnv,
  serverCommand,
  visualSnapshotOptions,
} from '../playwright.config.ts';
import { strict as assert } from 'node:assert';
import test from 'node:test';

test('keeps cross-platform visual tolerance narrowly bounded', () => {
  assert.equal(visualSnapshotOptions.maxDiffPixelRatio, 0.05);
});

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
  assert.equal(env.E2E_DATABASE_URL, undefined);
  assert.notEqual(env.BETTER_AUTH_SECRET, 'production-secret');
});

test('does not merge unrelated inherited environment variables into public startup', () => {
  const env = publicServerEnv({
    HOME: '/tmp/home',
    PATH: '/bin',
    SECRET_TOKEN: 'secret',
    NEXT_PUBLIC_UNEXPECTED: 'unexpected',
    NODE_OPTIONS: '--require=unexpected',
  });

  assert.deepEqual(Object.keys(env).sort(), [
    'BETTER_AUTH_SECRET',
    'BETTER_AUTH_URL',
    'HOME',
    'NEXT_TELEMETRY_DISABLED',
    'NODE_ENV',
    'PATH',
    'PORT',
  ]);
  assert.equal(env.SECRET_TOKEN, undefined);
  assert.equal(env.NODE_OPTIONS, undefined);
  assert.equal(env.NEXT_PUBLIC_UNEXPECTED, undefined);
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

test('uses the public server only for public tests and the database server for DB tests', () => {
  const projects = projectDefinitions({
    E2E_DATABASE_URL:
      'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e',
    DATABASE_URL: 'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e',
  });

  assert.equal(projects[0]?.use?.baseURL, publicBaseURL);
  assert.equal(projects[2]?.use?.baseURL, databaseBaseURL);
  assert.match(projects[2]?.testMatch?.toString() ?? '', /authenticated-theme/);
  assert.equal(
    databaseServerEnv(
      {},
      'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e',
    ).DATABASE_URL,
    'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e',
  );
  assert.equal(publicServerEnv({}).PORT, '3000');
  assert.equal(
    databaseServerEnv(
      {},
      'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e',
    ).PORT,
    '3001',
  );
});

test('starts production servers through env -i so Playwright cannot reintroduce secrets', () => {
  const command = serverCommand(
    publicServerEnv({ SECRET_TOKEN: 'secret', DATABASE_URL: 'real-db' }),
  );
  assert.match(command, /^env -i /);
  assert.doesNotMatch(command, /SECRET_TOKEN|real-db/);
  assert.match(command, /pnpm --filter @mini-workout\/web start$/);
});

test('database server command contains only the explicit database environment', () => {
  const command = serverCommand(
    databaseServerEnv(
      { SECRET_TOKEN: 'secret' },
      'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e',
    ),
  );
  assert.match(command, /DATABASE_URL='postgresql/);
  assert.match(command, /E2E_DATABASE_URL='postgresql/);
  assert.doesNotMatch(command, /SECRET_TOKEN/);
});

test('rejects malicious shell environment keys before constructing a command', () => {
  assert.throws(
    () => serverCommand({ 'SAFE=bad command': 'value' }),
    /environment key/i,
  );
  assert.throws(
    () => serverCommand({ '$(touch /tmp/pwned)': 'value' }),
    /environment key/i,
  );
});
