import { spawn } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(fileURLToPath(new URL('../..', import.meta.url)));
const pnpm = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const reportRoot = mkdtempSync(resolve(tmpdir(), 'mini-workout-ci-local-'));
const localDatabaseUrl =
  process.env.E2E_DATABASE_URL ??
  'postgresql://postgres:postgres@127.0.0.1:5432/mini_workout_e2e';

const env = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL ?? localDatabaseUrl,
  E2E_DATABASE_URL: localDatabaseUrl,
  BETTER_AUTH_SECRET:
    process.env.BETTER_AUTH_SECRET ??
    'local-ci-secret-at-least-thirty-two-characters',
  BETTER_AUTH_TRUSTED_ORIGINS:
    process.env.BETTER_AUTH_TRUSTED_ORIGINS ??
    'http://localhost:3100,http://localhost:3101,http://localhost:3102',
  E2E_PUBLIC_PORT: process.env.E2E_PUBLIC_PORT ?? '3100',
  E2E_DATABASE_PORT: process.env.E2E_DATABASE_PORT ?? '3101',
  E2E_ADMIN_PORT: process.env.E2E_ADMIN_PORT ?? '3102',
  NEXT_TELEMETRY_DISABLED: '1',
  PLAYWRIGHT_HTML_OUTPUT_DIR: resolve(reportRoot, 'report'),
  PLAYWRIGHT_OUTPUT_DIR: resolve(reportRoot, 'results'),
};

const steps = [
  [
    'database migrations',
    ['--filter', '@mini-workout/database', 'db:migrate:deploy'],
  ],
  ['database seed', ['--filter', '@mini-workout/database', 'db:seed']],
  ['application build', ['build:apps']],
  ['E2E policy', ['--filter', '@mini-workout/e2e', 'test:policy']],
  [
    'public browser gate',
    [
      '--filter',
      '@mini-workout/e2e',
      'exec',
      'playwright',
      'test',
      '--project=public',
      '--project=public-mobile',
      '--retries=0',
    ],
  ],
  [
    'admin browser gate',
    [
      '--filter',
      '@mini-workout/e2e',
      'exec',
      'playwright',
      'test',
      '--project=admin',
      '--project=admin-mobile',
    ],
  ],
  [
    'verification browser gate',
    [
      '--filter',
      '@mini-workout/e2e',
      'exec',
      'playwright',
      'test',
      '--config=playwright.verification.config.ts',
    ],
  ],
  [
    'rate-limit browser gate',
    [
      '--filter',
      '@mini-workout/e2e',
      'exec',
      'playwright',
      'test',
      '--config=playwright.rate-limit.config.ts',
    ],
  ],
];

function runStep(name, args, stepEnv = env) {
  return new Promise((resolveStep, rejectStep) => {
    console.log(`\n▶ ${name}`);
    const child = spawn(pnpm, args, {
      cwd: repoRoot,
      env: stepEnv,
      stdio: 'inherit',
    });

    child.on('error', rejectStep);
    child.on('exit', (code, signal) => {
      if (code === 0) return resolveStep();
      rejectStep(
        new Error(
          `${name} failed with ${signal ? `signal ${signal}` : `exit code ${code}`}`,
        ),
      );
    });
  });
}

const policyEnv = { ...env };
delete policyEnv.DATABASE_URL;
delete policyEnv.E2E_DATABASE_URL;
delete policyEnv.E2E_PUBLIC_PORT;
delete policyEnv.E2E_DATABASE_PORT;
delete policyEnv.E2E_ADMIN_PORT;

for (const [name, args] of steps) {
  await runStep(name, args, name === 'E2E policy' ? policyEnv : env);
}

console.log('\n✓ Local CI-equivalent E2E gates passed.');
console.log(`Reports and traces: ${reportRoot}`);
