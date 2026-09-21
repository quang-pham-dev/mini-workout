import {
  adminBaseURL,
  adminServerCommand,
  adminServerEnv,
  default as config,
  databaseBaseURL,
  databaseServerEnv,
  projectDefinitions,
  publicBaseURL,
  publicServerEnv,
  resolveE2EPorts,
  serverCommand,
} from '../playwright.config.ts';
import { strict as assert } from 'node:assert';
import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const publicDatabaseUrl =
  'postgresql://invalid:invalid@127.0.0.1:1/mini_workout_public_test';
const databaseUrl =
  'postgresql://user:password@127.0.0.1:5432/mini_workout_e2e';

test('uses distinct default or environment-configured unprivileged E2E ports', () => {
  assert.deepEqual(resolveE2EPorts({}), {
    admin: 3002,
    database: 3001,
    public: 3000,
  });
  const env = {
    E2E_ADMIN_PORT: '3102',
    E2E_DATABASE_PORT: '3101',
    E2E_PUBLIC_PORT: '3100',
  };
  assert.deepEqual(resolveE2EPorts(env), {
    admin: 3102,
    database: 3101,
    public: 3100,
  });
  assert.equal(publicServerEnv(env).PORT, '3100');
  assert.equal(publicServerEnv(env).BETTER_AUTH_URL, 'http://localhost:3100');
  assert.equal(databaseServerEnv(env, databaseUrl).PORT, '3101');
  assert.equal(
    databaseServerEnv(env, databaseUrl).BETTER_AUTH_URL,
    'http://localhost:3101',
  );
  assert.equal(
    projectDefinitions(env).find(({ name }) => name === 'public')?.use?.baseURL,
    'http://localhost:3100',
  );
});

test('defines an isolated admin server and projects only with disposable DB env', () => {
  const env = {
    DATABASE_URL: databaseUrl,
    E2E_DATABASE_URL: databaseUrl,
    E2E_ADMIN_PORT: '3102',
    E2E_DATABASE_PORT: '3101',
    E2E_PUBLIC_PORT: '3100',
  };
  assert.equal(adminBaseURL, 'http://localhost:3002');
  assert.equal(adminServerEnv(env, databaseUrl).PORT, '3102');
  assert.equal(
    adminServerEnv(env, databaseUrl).BETTER_AUTH_URL,
    'http://localhost:3102',
  );
  assert.match(
    adminServerCommand(adminServerEnv(env, databaseUrl)),
    /@mini-workout\/admin start/,
  );
  const projects = projectDefinitions(env);
  assert.deepEqual(
    projects
      .filter(({ name }) => name.startsWith('admin'))
      .map(({ name }) => name),
    ['admin', 'admin-mobile'],
  );
});

for (const invalidPort of [
  '',
  ' 3100',
  '3100 ',
  '+3100',
  '3100.0',
  '03100',
  '1023',
  '65536',
]) {
  test(`rejects invalid E2E port ${JSON.stringify(invalidPort)}`, () => {
    assert.throws(
      () => resolveE2EPorts({ E2E_PUBLIC_PORT: invalidPort }),
      /E2E_PUBLIC_PORT.*integer.*1024.*65535/i,
    );
  });
}

test('rejects any duplicate E2E ports', () => {
  assert.throws(
    () =>
      resolveE2EPorts({
        E2E_DATABASE_PORT: '3100',
        E2E_PUBLIC_PORT: '3100',
      }),
    /public.*database.*admin.*distinct/i,
  );
});

test('rejects Chromium-restricted ports while retaining ordinary unprivileged ports', () => {
  assert.throws(
    () => resolveE2EPorts({ E2E_PUBLIC_PORT: '6000' }),
    /E2E_PUBLIC_PORT.*6000.*Chromium.*restricted/i,
  );
  assert.deepEqual(
    resolveE2EPorts({
      E2E_DATABASE_PORT: '3101',
      E2E_PUBLIC_PORT: '3100',
    }),
    { admin: 3002, database: 3101, public: 3100 },
  );
});

test('discovers arbitrary specs only in their directory project', () => {
  const discoveryId = randomUUID();
  const specName = `arbitrary-discovery-${discoveryId}.spec.ts`;
  const fixtureName = `arbitrary-discovery-${discoveryId}.test.ts`;
  const publicSpec = fileURLToPath(
    new URL(`../tests/public/${specName}`, import.meta.url),
  );
  const databaseSpec = fileURLToPath(
    new URL(`../tests/db/${specName}`, import.meta.url),
  );
  const fixtureTest = fileURLToPath(
    new URL(`./${fixtureName}`, import.meta.url),
  );
  const configPath = fileURLToPath(
    new URL('../playwright.config.ts', import.meta.url),
  );
  const cli = createRequire(import.meta.url).resolve('@playwright/test/cli');
  const spec =
    "import { test } from '@playwright/test';\ntest('arbitrary discovery contract', () => {});\n";
  const createdFiles: string[] = [];
  const reportRoot = mkdtempSync(join(tmpdir(), 'mini-workout-pw-list-'));
  const listEnvironment = {
    ...process.env,
    PLAYWRIGHT_HTML_OUTPUT_DIR: reportRoot,
  };

  try {
    for (const path of [publicSpec, databaseSpec, fixtureTest]) {
      writeFileSync(path, spec, { encoding: 'utf8', flag: 'wx' });
      createdFiles.push(path);
    }
    const publicList = execFileSync(
      process.execPath,
      [cli, 'test', '--list', '--project=public', '--config', configPath],
      {
        encoding: 'utf8',
        env: listEnvironment,
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );
    const databaseList = execFileSync(
      process.execPath,
      [cli, 'test', '--list', '--project=db', '--config', configPath],
      {
        encoding: 'utf8',
        env: {
          ...listEnvironment,
          DATABASE_URL: databaseUrl,
          E2E_DATABASE_URL: databaseUrl,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    );

    assert.match(publicList, new RegExp(`\\[public\\].*${specName}`));
    assert.doesNotMatch(
      publicList,
      new RegExp(`\\[db\\]|\\[db-setup\\]|${fixtureName}`),
    );
    assert.match(databaseList, new RegExp(`\\[db\\].*${specName}`));
    assert.match(databaseList, /\[db-setup\].*global\.setup\.ts/);
    assert.doesNotMatch(
      databaseList,
      new RegExp(`\\[public\\]|${fixtureName}`),
    );
  } finally {
    for (const path of createdFiles) rmSync(path, { force: true });
    rmSync(reportRoot, { force: true, recursive: true });
  }
});

test('uses a coordinator global setup rather than metadata-driven teardown', () => {
  assert.equal(config.globalSetup, './coordinator.setup.ts');
  assert.equal(config.globalTeardown, undefined);
});

for (const present of ['neither', 'DATABASE_URL', 'E2E_DATABASE_URL']) {
  test(`explicit db selection with ${present} configured fails rather than running public`, () => {
    const env = { ...process.env };
    delete env.DATABASE_URL;
    delete env.E2E_DATABASE_URL;
    if (present !== 'neither') env[present] = 'postgresql://localhost/test';
    assert.throws(
      () =>
        execFileSync(
          process.execPath,
          [
            createRequire(import.meta.url).resolve('@playwright/test/cli'),
            'test',
            '--list',
            '--project=db',
            '--config',
            fileURLToPath(new URL('../playwright.config.ts', import.meta.url)),
          ],
          { env, timeout: 10000, stdio: 'pipe' },
        ),
      /Project\(s\).*db.*not found|requires both/,
    );
  });
}

test('uses strict platform-and-project-specific snapshots with explicit update policy', () => {
  assert.equal(
    config.snapshotPathTemplate,
    '{testDir}/__screenshots__/{platform}/{projectName}/{testFilePath}/{arg}{ext}',
  );
  assert.equal(config.expect?.toHaveScreenshot, undefined);
  assert.equal(config.updateSnapshots, process.env.CI ? 'none' : 'missing');

  const configUrl = new URL('../playwright.config.ts', import.meta.url).href;
  const ciPolicy = execFileSync(
    process.execPath,
    [
      '--experimental-strip-types',
      '--input-type=module',
      '--eval',
      `import config from ${JSON.stringify(configUrl)}; process.stdout.write(String(config.updateSnapshots));`,
    ],
    {
      encoding: 'utf8',
      env: { ...process.env, CI: 'true' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );
  assert.equal(ciPolicy, 'none');
});

test('documents the strict canonical visual policy and current update command', () => {
  const e2eReadme = readFileSync(
    fileURLToPath(new URL('../README.md', import.meta.url)),
    'utf8',
  );
  const testingGuide = readFileSync(
    fileURLToPath(new URL('../../docs/TESTING.md', import.meta.url)),
    'utf8',
  );
  const documentation = `${e2eReadme}\n${testingGuide}`;

  assert.doesNotMatch(documentation, /5%|maxDiffPixelRatio/);
  assert.doesNotMatch(
    e2eReadme,
    /keyboard assertions\s+are intentionally omitted/i,
  );
  assert.match(
    testingGuide,
    /__screenshots__\/linux\/public\/tests\/public\/theme\.spec\.ts/,
  );
  assert.match(
    testingGuide,
    /\{platform\}\/\{projectName\}\/\{testFilePath\}\/\{arg\}\{ext\}/,
  );
  assert.match(testingGuide, /CI[^.]*`none`/s);
  assert.match(testingGuide, /local[^.]*`missing`/is);
  assert.match(
    testingGuide,
    /test:e2e:update -- --project=public tests\/public\/theme\.spec\.ts/,
  );
});

test('targets mobile behavior with Pixel projects instead of duplicating suites', () => {
  const projects = projectDefinitions({
    E2E_DATABASE_URL: databaseUrl,
    DATABASE_URL: databaseUrl,
  });
  const publicProject = projects.find(({ name }) => name === 'public');
  const publicMobile = projects.find(({ name }) => name === 'public-mobile');
  const databaseProject = projects.find(({ name }) => name === 'db');
  const databaseMobile = projects.find(({ name }) => name === 'db-mobile');
  const adminProject = projects.find(({ name }) => name === 'admin');
  const adminMobile = projects.find(({ name }) => name === 'admin-mobile');

  assert.deepEqual(
    projects.map(({ name }) => name),
    [
      'public',
      'public-mobile',
      'db-setup',
      'db',
      'db-mobile',
      'admin',
      'admin-mobile',
    ],
  );
  assert.equal(
    publicProject?.testMatch?.test('tests/public/theme-mobile.spec.ts'),
    false,
  );
  assert.equal(
    databaseProject?.testMatch?.test('tests/db/navigation-mobile.spec.ts'),
    false,
  );
  assert.equal(
    publicMobile?.testMatch?.test('tests/public/theme-mobile.spec.ts'),
    true,
  );
  assert.equal(
    publicMobile?.testMatch?.test('tests/public/infrastructure.spec.ts'),
    false,
  );
  assert.equal(
    databaseMobile?.testMatch?.test('tests/db/navigation-mobile.spec.ts'),
    true,
  );
  assert.equal(databaseMobile?.testMatch?.test('tests/db/auth.spec.ts'), false);
  assert.deepEqual(databaseMobile?.dependencies, ['db-setup']);
  assert.equal(
    adminProject?.testMatch?.test(
      'tests/admin/accessibility-responsive.spec.ts',
    ),
    false,
  );
  assert.equal(
    adminMobile?.testMatch?.test(
      'tests/admin/accessibility-responsive.spec.ts',
    ),
    true,
  );
  assert.deepEqual(adminMobile?.dependencies, ['db-setup']);
  assert.ok(publicMobile?.use && 'viewport' in publicMobile.use);
  assert.deepEqual(publicMobile.use.viewport, { width: 412, height: 839 });
  assert.equal(publicMobile.use.isMobile, true);
  assert.equal(publicMobile.use.hasTouch, true);
  assert.equal(databaseMobile?.use?.baseURL, databaseBaseURL);
  assert.equal(databaseMobile?.use?.trace, 'off');
});

test('pins the Linux CI runner and scopes the admin browser gate to a disposable database', () => {
  const workflow = readFileSync(
    fileURLToPath(new URL('../../.github/workflows/ci.yml', import.meta.url)),
    'utf8',
  );

  // CI must run on the pinned Ubuntu version.
  assert.match(workflow, /runs-on: ubuntu-24\.04/);

  // Browser journeys run only in the explicitly disposable admin job.
  assert.match(workflow, /admin-readiness:[\s\S]*image: postgres:16/);
  assert.match(workflow, /POSTGRES_DB: mini_workout_e2e/);
  assert.match(
    workflow,
    /E2E_DATABASE_URL: postgresql:\/\/postgres:postgres@127\.0\.0\.1:5432\/mini_workout_e2e/,
  );
  assert.match(
    workflow,
    /name: Install Chromium\s+run: pnpm --filter @mini-workout\/e2e exec playwright install --with-deps chromium/,
  );
  assert.match(
    workflow,
    /name: Run disposable admin E2E\s+run: pnpm test:e2e:admin/,
  );
  assert.doesNotMatch(workflow, /run: pnpm test:e2e -- --project=/);

  // E2E policy tests (Node.js-only fixture contracts) must still run.
  assert.match(workflow, /Run E2E policy tests/);
  assert.match(workflow, /pnpm --filter @mini-workout\/e2e test/);
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

  assert.equal(env.DATABASE_URL, publicDatabaseUrl);
  assert.equal(env.E2E_DATABASE_URL, '');
  assert.notEqual(env.BETTER_AUTH_SECRET, 'production-secret');
});

test('starts the database-free public server against its liveness probe', () => {
  assert.equal(Array.isArray(config.webServer), false);
  assert.equal(
    Array.isArray(config.webServer) ? undefined : config.webServer?.url,
    `${publicBaseURL}/api/health/live`,
  );
});

test('explicit public database environment wins over a conflicting Next env file', () => {
  const root = mkdtempSync(join(tmpdir(), 'mini-workout-next-env-'));
  const explicitPublicEnv = publicServerEnv({});
  const requireFromWeb = createRequire(
    new URL('../../apps/web/package.json', import.meta.url),
  );
  const requireFromNext = createRequire(
    requireFromWeb.resolve('next/package.json'),
  );
  const nextEnvPath = requireFromNext.resolve('@next/env');

  try {
    writeFileSync(
      join(root, '.env.local'),
      [
        'DATABASE_URL=postgresql://conflicting.example/real',
        'E2E_DATABASE_URL=postgresql://conflicting.example/e2e',
        '',
      ].join('\n'),
      'utf8',
    );
    execFileSync(
      process.execPath,
      [
        '--eval',
        `const assert = require('node:assert').strict; const { loadEnvConfig } = require(${JSON.stringify(nextEnvPath)}); loadEnvConfig(${JSON.stringify(root)}, false); assert.equal(process.env.DATABASE_URL, ${JSON.stringify(explicitPublicEnv.DATABASE_URL)}); assert.equal(process.env.E2E_DATABASE_URL, ${JSON.stringify(explicitPublicEnv.E2E_DATABASE_URL)});`,
      ],
      {
        env: explicitPublicEnv,
        stdio: 'pipe',
      },
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
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
    'DATABASE_URL',
    'E2E_DATABASE_URL',
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
  assert.deepEqual(
    projectDefinitions({ E2E_DATABASE_URL: databaseUrl }).map(
      ({ name }) => name,
    ),
    ['public', 'public-mobile'],
  );
  assert.deepEqual(
    projectDefinitions({ DATABASE_URL: databaseUrl }).map(({ name }) => name),
    ['public', 'public-mobile'],
  );
  assert.deepEqual(
    projectDefinitions({
      E2E_DATABASE_URL: databaseUrl,
      DATABASE_URL: databaseUrl,
    }).map(({ name }) => name),
    [
      'public',
      'public-mobile',
      'db-setup',
      'db',
      'db-mobile',
      'admin',
      'admin-mobile',
    ],
  );
});

test('uses the public server only for public tests and the database server for DB tests', () => {
  const projects = projectDefinitions({
    E2E_DATABASE_URL: databaseUrl,
    DATABASE_URL: databaseUrl,
  });
  const databaseEnv = databaseServerEnv({}, databaseUrl);
  const publicProject = projects.find(({ name }) => name === 'public');
  const setupProject = projects.find(({ name }) => name === 'db-setup');
  const databaseProject = projects.find(({ name }) => name === 'db');

  assert.equal(publicProject?.use?.baseURL, publicBaseURL);
  assert.equal(setupProject?.use?.trace, 'off');
  assert.equal(databaseProject?.use?.baseURL, databaseBaseURL);
  assert.equal(databaseProject?.use?.trace, 'off');
  assert.match(databaseProject?.testMatch?.toString() ?? '', /tests\\\/db/);
  assert.equal(databaseEnv.DATABASE_URL, databaseUrl);
  assert.equal(databaseEnv.E2E_DATABASE_URL, databaseUrl);
  assert.equal(publicServerEnv({}).PORT, '3000');
  assert.equal(databaseEnv.PORT, '3001');
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

test('database server environment rejects a non-disposable database URL', () => {
  assert.throws(
    () => databaseServerEnv({}, 'postgresql://db.example/production'),
    /database|localhost|loopback|approved/i,
  );
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
