import {
  requestFixtureOwnership,
  requestFixturePreparation,
  startFixtureCoordinator,
} from '../coordinator.setup.ts';
import { isDatabaseLockOwner, lockPathForDatabase } from './database-lock.ts';
import { fixtureArtifactPaths, fixtureMetadata } from './metadata.ts';
import { startSetupCommand } from './setup-command.ts';
import { strict as assert } from 'node:assert';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';

async function waitForFile(path: string, timeoutMs = 10_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!existsSync(path)) {
    assert.ok(Date.now() < deadline, `Timed out waiting for ${path}`);
    await delay(20);
  }
}

async function terminateProcess(
  pid: number,
  timeoutMs = 10_000,
): Promise<void> {
  try {
    process.kill(pid, 'SIGKILL');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ESRCH') return;
    throw error;
  }

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ESRCH') return;
      throw error;
    }
    await delay(20);
  }
  assert.fail(`Process ${pid} did not terminate within ${timeoutMs}ms`);
}

test(
  'managed commands complete, report failure, and time out with proven termination',
  { timeout: 10000 },
  async () => {
    const successful = startSetupCommand(
      { command: process.execPath, args: ['-e', 'process.exit(0)'] },
      process.env,
    );
    await successful.finished;
    await successful.stop();
    const failed = startSetupCommand(
      { command: process.execPath, args: ['-e', 'process.exit(7)'] },
      process.env,
    );
    await assert.rejects(failed.finished, /exit 7/);
    await failed.stop();
    const timedOut = startSetupCommand(
      {
        command: process.execPath,
        args: ['-e', 'setInterval(() => {}, 1000)'],
      },
      process.env,
      100,
    );
    await assert.rejects(timedOut.finished, /timed out/);
    await timedOut.stop();
    const missing = startSetupCommand(
      { command: '/does-not-exist/e2e-command', args: [] },
      process.env,
    );
    await assert.rejects(missing.finished, /could not start/);
    await missing.stop();
  },
);

test(
  'termination escalates when a command ignores SIGTERM and reaps it',
  { timeout: 20000 },
  async () => {
    const root = mkdtempSync(join(tmpdir(), 'e2e-command-kill-'));
    const ready = join(root, 'pid');
    const command = startSetupCommand(
      {
        command: process.execPath,
        args: [
          '-e',
          `process.on('SIGTERM', () => {}); require('node:fs').writeFileSync(${JSON.stringify(ready)}, String(process.pid)); setInterval(() => {}, 1000);`,
        ],
      },
      process.env,
    );
    const result = command.finished.catch((error) => error);
    try {
      await waitForFile(ready);
      await command.stop();
      assert.match(String(await result), /exit signal/);
      assert.throws(
        () => process.kill(Number(readFileSync(ready, 'utf8')), 0),
        (error: NodeJS.ErrnoException) => error.code === 'ESRCH',
      );
    } finally {
      await command.stop();
      await result;
      rmSync(root, { recursive: true, force: true });
    }
  },
);

test(
  'unproven writer termination prohibits auth, DB, metadata cleanup and release',
  { timeout: 30000 },
  async () => {
    const root = mkdtempSync(join(tmpdir(), 'e2e-command-proof-'));
    const url = 'postgresql://localhost/test';
    const old = {
      DATABASE_URL: process.env.DATABASE_URL,
      E2E_DATABASE_URL: process.env.E2E_DATABASE_URL,
      CONTRACT_ROOT: process.env.CONTRACT_ROOT,
    };
    process.env.DATABASE_URL = process.env.E2E_DATABASE_URL = url;
    process.env.CONTRACT_ROOT = root;
    const events: string[] = [];
    let commandPid: number | undefined;
    const finalize = await startFixtureCoordinator({
      lockDirectory: root,
      authRoot: join(root, 'auth'),
      commands: [
        {
          command: process.execPath,
          args: [
            '-e',
            `const fs = require('node:fs'); const path = require('node:path'); fs.writeFileSync(path.join(process.env.CONTRACT_ROOT, 'command-pids'), JSON.stringify([process.pid])); fs.writeFileSync(path.join(process.env.CONTRACT_ROOT, 'ready'), 'command'); setInterval(() => {}, 1000);`,
          ],
        },
      ],
      cleanupDatabase: () => {
        events.push('database');
      },
      beforeRelease: () => {
        events.push('release');
      },
      killProcess: (target, signal) => {
        if (
          commandPid !== undefined &&
          target === -commandPid &&
          (signal === 0 || signal === 'SIGKILL')
        )
          throw Object.assign(new Error('unverifiable group'), {
            code: 'EPERM',
          });
        return process.kill(target, signal);
      },
    });
    let preparation: Promise<unknown> | undefined;
    try {
      const token = await requestFixtureOwnership();
      const { authDirectory, metadataPath } = fixtureArtifactPaths(
        url,
        token,
        join(root, 'auth'),
      );
      mkdirSync(authDirectory, { recursive: true });
      writeFileSync(join(authDirectory, 'active.json'), 'keep auth');
      writeFileSync(metadataPath, JSON.stringify(fixtureMetadata(url, token)));
      preparation = requestFixturePreparation(token).catch((error) => error);
      await waitForFile(join(root, 'ready'));
      const [pid] = JSON.parse(
        readFileSync(join(root, 'command-pids'), 'utf8'),
      ) as number[];
      assert.notEqual(pid, undefined);
      commandPid = pid;
      await assert.rejects(
        finalize(),
        /Cannot establish.*termination.*Lock retained/,
      );
      await assert.rejects(finalize(), /Lock retained/);
      assert.deepEqual(events, []);
      assert.equal(
        readFileSync(join(authDirectory, 'active.json'), 'utf8'),
        'keep auth',
      );
      assert.equal(existsSync(metadataPath), true);
      assert.equal(isDatabaseLockOwner(url, token, root), true);
      assert.equal(existsSync(lockPathForDatabase(url, root)), true);
    } finally {
      await finalize().catch(() => undefined);
      try {
        if (existsSync(join(root, 'command-pids'))) {
          const [pid] = JSON.parse(
            readFileSync(join(root, 'command-pids'), 'utf8'),
          ) as number[];
          if (pid !== undefined) {
            await terminateProcess(pid);
          }
        }
        await preparation;
      } finally {
        for (const [key, value] of Object.entries(old)) {
          if (value === undefined) delete process.env[key];
          else process.env[key] = value;
        }
        rmSync(root, { recursive: true, force: true });
      }
    }
  },
);
