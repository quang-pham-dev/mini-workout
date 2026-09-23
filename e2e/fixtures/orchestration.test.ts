import {
  acquireDatabaseLock,
  isDatabaseLockOwner,
  lockPathForDatabase,
} from './database-lock.ts';
import { fixtureArtifactPaths } from './metadata.ts';
import { strict as assert } from 'node:assert';
import { spawn } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const cli = require.resolve('@playwright/test/cli');
const config = fileURLToPath(
  new URL('./orchestration/playwright.config.ts', import.meta.url),
);
const url = 'postgresql://user:password@127.0.0.1/mini_workout_e2e';
// Playwright startup can exceed 20 seconds on a cold GitHub-hosted runner
// while the coordinator is still healthy. Keep the watchdog bounded, but give
// the child enough time to finish before treating it as an orchestration leak.
const orchestrationChildTimeoutMs = 60_000;

for (const mode of [
  'public',
  'db',
  'signup',
  'signin',
  'storage-state',
  'metadata',
  'api-creation',
  'interrupt-setup',
  'interrupt-consumer',
  'local-cleanup',
  'kill-setup',
  'kill-worker-command',
]) {
  test(
    `real Playwright coordinator: ${mode}`,
    { timeout: orchestrationChildTimeoutMs + 30_000 },
    async () => {
      const root = mkdtempSync(join(tmpdir(), 'e2e-orchestration-'));
      const child = spawn(
        process.execPath,
        [
          cli,
          'test',
          '--config',
          config,
          `--project=${mode === 'public' ? 'public' : 'db'}`,
        ],
        {
          detached: true,
          env: {
            ...process.env,
            DATABASE_URL: url,
            E2E_DATABASE_URL: url,
            CONTRACT_ROOT: root,
            CONTRACT_SETUP_FAIL: ['public', 'db'].includes(mode) ? '' : mode,
            CONTRACT_CLEANUP_FAIL: mode === 'signup' ? 'database' : '',
          },
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      );
      let output = '';
      child.stdout.on('data', (chunk) => {
        output += chunk;
      });
      child.stderr.on('data', (chunk) => {
        output += chunk;
      });
      const done = new Promise<number | null>((resolve, reject) => {
        child.once('error', reject);
        child.once('close', resolve);
      });
      const stopChildren = () => {
        if (existsSync(join(root, 'command-pids'))) {
          const [pid] = JSON.parse(
            readFileSync(join(root, 'command-pids'), 'utf8'),
          ) as number[];
          if (pid !== undefined) {
            try {
              process.kill(-pid, 'SIGKILL');
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code !== 'ESRCH')
                throw error;
            }
          }
        }
        if (child.pid === undefined) return;
        try {
          process.kill(-child.pid, 'SIGKILL');
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== 'ESRCH') throw error;
        }
      };
      const timer = setTimeout(stopChildren, orchestrationChildTimeoutMs);
      let signaled = false;
      const signalTimer = setInterval(() => {
        if (
          !signaled &&
          (mode.startsWith('interrupt-') ||
            mode === 'kill-setup' ||
            mode === 'kill-worker-command') &&
          existsSync(join(root, 'ready'))
        ) {
          if (mode === 'kill-worker-command') {
            const { pid } = JSON.parse(
              readFileSync(join(root, 'setup'), 'utf8'),
            );
            const coordinatorPid = Number(
              readFileSync(join(root, 'coordinator'), 'utf8'),
            );
            assert.notEqual(pid, coordinatorPid, 'kill only the setup worker');
            process.kill(pid, 'SIGKILL');
            signaled = true;
            assert.doesNotThrow(
              () => process.kill(coordinatorPid, 0),
              'coordinator stays alive',
            );
          } else
            signaled = child.kill(mode === 'kill-setup' ? 'SIGKILL' : 'SIGINT');
        }
      }, 20);
      try {
        const status = await done;
        const expected =
          mode === 'kill-setup'
            ? null
            : mode.startsWith('interrupt-')
              ? 130
              : ['public', 'db'].includes(mode)
                ? 0
                : 1;
        assert.equal(status, expected, output);
        if (
          mode.startsWith('interrupt-') ||
          mode === 'kill-setup' ||
          mode === 'kill-worker-command'
        )
          assert.equal(signaled, true, output);
        assert.deepEqual(
          JSON.parse(readFileSync(join(root, 'configured-projects'), 'utf8')),
          ['public', 'db-setup', 'db'],
        );
        if (mode === 'public')
          assert.equal(existsSync(join(root, 'events')), false);
        else {
          const setup = JSON.parse(
            readFileSync(join(root, 'setup'), 'utf8'),
          ) as {
            pid: number;
            token: string;
          };
          const token = setup.token;
          const { authDirectory, metadataPath } = fixtureArtifactPaths(
            url,
            token,
            join(root, 'auth'),
          );
          if (mode === 'kill-setup') {
            assert.equal(child.signalCode, 'SIGKILL');
            assert.equal(existsSync(join(root, 'events')), false);
            assert.equal(existsSync(authDirectory), true);
            assert.equal(existsSync(metadataPath), true);
            assert.equal(isDatabaseLockOwner(url, token, root), true);
            assert.throws(
              () => acquireDatabaseLock(url, root),
              /Manual recovery/,
            );
            return;
          }
          assert.equal(existsSync(authDirectory), false, output);
          assert.equal(existsSync(metadataPath), false, output);
          assert.equal(existsSync(lockPathForDatabase(url, root)), false);
          if (
            [
              'db',
              'signup',
              'signin',
              'storage-state',
              'interrupt-consumer',
              'local-cleanup',
            ].includes(mode)
          ) {
            const stages = readFileSync(join(root, 'auth-stages'), 'utf8');
            assert.match(stages, /^signup\nconfigure\nsignin\n/);
            if (mode === 'signup')
              assert.match(stages, /storage-state\nsignup\n/);
          } else assert.equal(existsSync(join(root, 'auth-stages')), false);
          if (mode === 'db' || mode === 'interrupt-consumer') {
            const consumer = JSON.parse(
              readFileSync(join(root, 'consumer'), 'utf8'),
            ) as { pid: number; token: string };
            assert.notEqual(consumer.pid, setup.pid);
            assert.equal(consumer.token, setup.token);
          }
          if (
            mode === 'db' ||
            mode === 'interrupt-consumer' ||
            mode === 'local-cleanup'
          ) {
            const consumer = JSON.parse(
              readFileSync(join(root, 'consumer'), 'utf8'),
            ) as { token: string; email: string };
            const claims = JSON.parse(
              readFileSync(join(root, 'final-claims'), 'utf8'),
            ) as string[];
            assert.deepEqual(claims, [consumer.email]);
            assert.equal(consumer.token, token);
            assert.equal(
              readFileSync(join(root, 'claim-stages'), 'utf8'),
              mode === 'local-cleanup' ? 'claim\noperation\n' : 'claim\n',
            );
          }
          assert.equal(
            readFileSync(join(root, 'events'), 'utf8'),
            `${mode === 'kill-worker-command' ? 'command-stopped\n' : ''}database\nbeforeRelease\n`,
          );
          if (
            mode !== 'db' &&
            mode !== 'local-cleanup' &&
            mode !== 'kill-worker-command' &&
            !mode.startsWith('interrupt-')
          )
            assert.match(output, new RegExp(`original ${mode} failure`));
          if (mode === 'local-cleanup') {
            assert.match(output, /original operation failure/);
            assert.match(output, /original local cleanup failure/);
          }
        }
        assert.equal(
          readdirSync(root).some((name) => name.endsWith('.lock')),
          false,
        );
      } finally {
        clearTimeout(timer);
        clearInterval(signalTimer);
        stopChildren();
        await done.catch(() => undefined);
        try {
          const workers = [
            existsSync(join(root, 'setup'))
              ? (JSON.parse(readFileSync(join(root, 'setup'), 'utf8'))
                  .pid as number)
              : undefined,
            existsSync(join(root, 'consumer'))
              ? ((
                  JSON.parse(readFileSync(join(root, 'consumer'), 'utf8')) as {
                    pid: number;
                  }
                ).pid as number)
              : undefined,
            ...(existsSync(join(root, 'command-pids'))
              ? (JSON.parse(
                  readFileSync(join(root, 'command-pids'), 'utf8'),
                ) as number[])
              : []),
          ].filter((pid): pid is number => pid !== undefined);
          for (const pid of workers) {
            let alive = true;
            for (let attempt = 0; attempt < 100; attempt++) {
              try {
                process.kill(pid, 0);
              } catch (error) {
                assert.equal((error as NodeJS.ErrnoException).code, 'ESRCH');
                alive = false;
                break;
              }
              await delay(20);
            }
            assert.equal(alive, false, `worker ${pid} leaked`);
          }
        } finally {
          rmSync(root, { recursive: true, force: true });
        }
      }
    },
  );
}
