import {
  requestFixtureOwnership,
  requestFixtureRunToken,
  requestMutationUserClaim,
  startFixtureCoordinator,
} from '../coordinator.setup.ts';
import {
  databaseRunKey,
  isDatabaseLockOwner,
  lockPathForDatabase,
} from './database-lock.ts';
import { fixtureMetadata } from './metadata.ts';
import { withFixtureTeardown } from './setup-lifecycle.ts';
import { createMutationUserEmail } from './user.ts';
import { strict as assert } from 'node:assert';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';

test('rejects a coordinator token response with an unexpected content type', async () => {
  const token = randomUUID();
  const secret = randomUUID();
  const server = createServer((_request, response) => {
    response.writeHead(200, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ token }));
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const previousUrl = process.env.E2E_COORDINATOR_URL;
  const previousSecret = process.env.E2E_COORDINATOR_SECRET;
  process.env.E2E_COORDINATOR_URL = `http://127.0.0.1:${address.port}/acquire`;
  process.env.E2E_COORDINATOR_SECRET = secret;

  try {
    await assert.rejects(requestFixtureRunToken(), /content type/i);
  } finally {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    if (previousUrl === undefined) delete process.env.E2E_COORDINATOR_URL;
    else process.env.E2E_COORDINATOR_URL = previousUrl;
    if (previousSecret === undefined) delete process.env.E2E_COORDINATOR_SECRET;
    else process.env.E2E_COORDINATOR_SECRET = previousSecret;
  }
});

test('coordinator authenticates and retains only exact current-run mutation claims', async () => {
  const root = mkdtempSync(join(tmpdir(), 'e2e-claims-'));
  const url = 'postgresql://user:secret@127.0.0.1/mini_workout_e2e';
  const previous = {
    databaseUrl: process.env.DATABASE_URL,
    e2eDatabaseUrl: process.env.E2E_DATABASE_URL,
  };
  process.env.DATABASE_URL = process.env.E2E_DATABASE_URL = url;
  let finalClaims: readonly string[] = [];
  let claimedEmail: string | undefined;
  const finalize = await startFixtureCoordinator({
    lockDirectory: root,
    authRoot: join(root, 'auth'),
    cleanupDatabase: (_databaseUrl, _token, claimedEmails) => {
      finalClaims = claimedEmails;
    },
  });

  try {
    const token = await requestFixtureOwnership();
    const email = createMutationUserEmail({
      runToken: token,
      testId: 'claim-contract',
      parallelIndex: 0,
      workerIndex: 1,
      retry: 0,
      repeatEachIndex: 0,
    });
    claimedEmail = email;
    const otherRunEmail = createMutationUserEmail({
      runToken: randomUUID(),
      testId: 'claim-contract',
      parallelIndex: 0,
      workerIndex: 1,
      retry: 0,
      repeatEachIndex: 0,
    });
    const endpoint = new URL(process.env.E2E_COORDINATOR_URL!);
    endpoint.pathname = '/claim';
    const unauthorized = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer wrong-secret',
        'Content-Type': 'text/plain',
        'X-E2E-Run-Token': token,
      },
      body: email,
    });
    assert.equal(unauthorized.status, 403);
    assert.equal(await unauthorized.text(), '');

    const rejected = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.E2E_COORDINATOR_SECRET}`,
        'Content-Type': 'text/plain',
        'X-E2E-Run-Token': token,
      },
      body: otherRunEmail,
    });
    assert.equal(rejected.status, 409);
    assert.match(await rejected.text(), /not owned by this E2E run/);

    await requestMutationUserClaim(token, email);
    await requestMutationUserClaim(token, email);
    await assert.rejects(
      requestMutationUserClaim(token, otherRunEmail),
      /not owned by this E2E run/,
    );
  } finally {
    await finalize();
    assert.deepEqual(finalClaims, [claimedEmail]);
    if (previous.databaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previous.databaseUrl;
    if (previous.e2eDatabaseUrl === undefined)
      delete process.env.E2E_DATABASE_URL;
    else process.env.E2E_DATABASE_URL = previous.e2eDatabaseUrl;
    rmSync(root, { recursive: true, force: true });
  }
});

test('stops cleanup as soon as its own token loses ownership', async () => {
  let owned = true;
  const events: string[] = [];
  await withFixtureTeardown({
    ownsLock: () => owned,
    removeAuth: () => {
      events.push('auth');
      owned = false;
    },
    cleanupDatabase: () => {
      events.push('database');
    },
    removeMetadata: () => {
      events.push('metadata');
    },
    release: () => {
      events.push('release');
    },
  });
  assert.deepEqual(events, ['auth']);
});

test('named cleanup checks ownership before every side effect and preserves first error', async () => {
  const events: string[] = [];
  const first = new Error('auth failed');
  await assert.rejects(
    withFixtureTeardown({
      ownsLock: () => true,
      removeAuth: () => {
        events.push('auth');
        throw first;
      },
      cleanupDatabase: () => {
        events.push('database');
      },
      removeMetadata: () => {
        events.push('metadata');
        throw new Error('metadata');
      },
      release: () => {
        events.push('release');
      },
    }),
    (error) =>
      error instanceof AggregateError &&
      error.cause === first &&
      error.errors[0] === first &&
      String(error.errors[1]).includes('metadata'),
  );
  assert.deepEqual(events, ['auth', 'database', 'metadata', 'release']);
  events.length = 0;
  await withFixtureTeardown({
    ownsLock: () => false,
    removeAuth: () => {
      events.push('auth');
    },
    cleanupDatabase: () => {
      events.push('database');
    },
    removeMetadata: () => {
      events.push('metadata');
    },
    release: () => {
      events.push('release');
    },
  });
  assert.deepEqual(events, []);
});

test(
  'no-token and rejected B finalizers cannot clean A; bounded children cannot steal A',
  { timeout: 20000 },
  async () => {
    const root = mkdtempSync(join(tmpdir(), 'e2e-coordinator-'));
    const url = 'postgresql://user:secret@127.0.0.1/mini_workout_e2e';
    const old = {
      DATABASE_URL: process.env.DATABASE_URL,
      E2E_DATABASE_URL: process.env.E2E_DATABASE_URL,
    };
    process.env.DATABASE_URL = process.env.E2E_DATABASE_URL = url;
    const events: string[] = [];
    const authRoot = join(root, 'auth');
    let authDirectory: string;
    let metadataPath: string;
    const otherRun = join(authRoot, databaseRunKey(url), randomUUID());
    const options = {
      lockDirectory: root,
      authRoot,
      cleanupDatabase: (_url: string, token: string) => {
        assert.equal(isDatabaseLockOwner(url, token, root), true);
        assert.equal(
          existsSync(authDirectory),
          false,
          'real auth removal precedes DB cleanup',
        );
        assert.equal(
          existsSync(metadataPath),
          true,
          'metadata survives auth removal',
        );
        events.push('database');
      },
      beforeRelease: (_url: string, token: string) => {
        assert.equal(isDatabaseLockOwner(url, token, root), true);
        assert.equal(
          existsSync(metadataPath),
          false,
          'real metadata removal precedes release',
        );
        events.push('metadata');
      },
    };
    const a = await startFixtureCoordinator(options);
    try {
      const token = await requestFixtureOwnership();
      authDirectory = join(authRoot, databaseRunKey(url), token);
      metadataPath = `${authDirectory}.json`;
      mkdirSync(authDirectory, { recursive: true });
      writeFileSync(join(authDirectory, 'active.json'), 'A auth');
      writeFileSync(metadataPath, JSON.stringify(fixtureMetadata(url, token)));
      mkdirSync(otherRun, { recursive: true });
      writeFileSync(join(otherRun, 'active.json'), 'other run auth');
      writeFileSync(`${otherRun}.json`, 'other run metadata');
      const noToken = await startFixtureCoordinator(options);
      await noToken();
      const b = await startFixtureCoordinator(options);
      try {
        await assert.rejects(requestFixtureOwnership(), /already in use/);
      } finally {
        await b();
      }
      const moduleUrl = new URL('./database-lock.ts', import.meta.url).href;
      await Promise.all(
        [1, 2].map(() =>
          promisify(execFile)(
            process.execPath,
            [
              '--experimental-strip-types',
              '--input-type=module',
              '-e',
              `import { acquireDatabaseLock } from ${JSON.stringify(moduleUrl)};
       try { acquireDatabaseLock('postgres://other@localhost/mini_workout_e2e', ${JSON.stringify(root)}); process.exitCode = 1; }
       catch (error) { if (!/already in use/.test(error.message)) throw error; }`,
            ],
            { timeout: 10000, killSignal: 'SIGKILL' },
          ),
        ),
      );
      assert.deepEqual(events, []);
      assert.equal(
        readFileSync(join(authDirectory, 'active.json'), 'utf8'),
        'A auth',
      );
      assert.deepEqual(
        JSON.parse(readFileSync(metadataPath, 'utf8')),
        fixtureMetadata(url, token),
      );
      assert.equal(isDatabaseLockOwner(url, token, root), true);
      await a();
      await a();
      assert.deepEqual(events, ['database', 'metadata']);
      assert.equal(existsSync(authDirectory), false);
      assert.equal(existsSync(metadataPath), false);
      assert.equal(
        readFileSync(join(otherRun, 'active.json'), 'utf8'),
        'other run auth',
      );
      assert.equal(
        readFileSync(`${otherRun}.json`, 'utf8'),
        'other run metadata',
      );
      assert.equal(existsSync(lockPathForDatabase(url, root)), false);
    } finally {
      await a();
      for (const [key, value] of Object.entries(old)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
      rmSync(root, { recursive: true, force: true });
    }
  },
);
