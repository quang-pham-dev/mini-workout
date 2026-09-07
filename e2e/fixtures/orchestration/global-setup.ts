import { startFixtureCoordinator } from '../../coordinator.setup.ts';
import { isDatabaseLockOwner } from '../database-lock.ts';
import { fixtureArtifactPaths } from '../metadata.ts';
import type { FullConfig } from '@playwright/test';
import { strict as assert } from 'node:assert';
import {
  appendFileSync,
  existsSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export default async function setup(config: FullConfig) {
  const root = process.env.CONTRACT_ROOT!;
  writeFileSync(join(root, 'coordinator'), String(process.pid));
  writeFileSync(
    join(root, 'configured-projects'),
    JSON.stringify(config.projects.map((project) => project.name)),
  );
  return startFixtureCoordinator({
    commands: [
      {
        command: process.execPath,
        args: [fileURLToPath(new URL('./long-command.ts', import.meta.url))],
      },
    ],
    lockDirectory: root,
    authRoot: join(root, 'auth'),
    cleanupDatabase: (databaseUrl, token, claimedEmails) => {
      const workerPids = [
        JSON.parse(readFileSync(join(root, 'setup'), 'utf8')).pid as number,
        existsSync(join(root, 'consumer'))
          ? ((
              JSON.parse(readFileSync(join(root, 'consumer'), 'utf8')) as {
                pid: number;
              }
            ).pid as number)
          : undefined,
      ];
      if (process.env.CONTRACT_SETUP_FAIL === 'kill-worker-command') {
        const pids = JSON.parse(
          readFileSync(join(root, 'command-pids'), 'utf8'),
        ) as number[];
        for (const pid of pids)
          assert.throws(
            () => process.kill(pid, 0),
            (error: NodeJS.ErrnoException) => error.code === 'ESRCH',
            'command writers must be dead before cleanup',
          );
        appendFileSync(join(root, 'events'), 'command-stopped\n');
      }
      for (const pid of workerPids) {
        if (pid !== undefined)
          assert.throws(
            () => process.kill(pid, 0),
            (error: NodeJS.ErrnoException) => error.code === 'ESRCH',
            'workers must exit before artifact/DB cleanup',
          );
      }
      const { authDirectory, metadataPath } = fixtureArtifactPaths(
        databaseUrl,
        token,
        join(root, 'auth'),
      );
      assert.equal(isDatabaseLockOwner(databaseUrl, token, root), true);
      assert.equal(
        existsSync(authDirectory),
        false,
        'auth removed before DB cleanup',
      );
      assert.equal(
        existsSync(metadataPath),
        process.env.CONTRACT_SETUP_FAIL !== 'metadata',
        'metadata is not removed by auth cleanup',
      );
      appendFileSync(join(root, 'events'), 'database\n');
      writeFileSync(join(root, 'final-claims'), JSON.stringify(claimedEmails));
      if (process.env.CONTRACT_CLEANUP_FAIL)
        throw new Error('injected cleanup failure');
    },
    beforeRelease: (databaseUrl, token) => {
      const { authDirectory, metadataPath } = fixtureArtifactPaths(
        databaseUrl,
        token,
        join(root, 'auth'),
      );
      assert.equal(isDatabaseLockOwner(databaseUrl, token, root), true);
      assert.equal(existsSync(authDirectory), false);
      assert.equal(
        existsSync(metadataPath),
        false,
        'metadata removed before release',
      );
      appendFileSync(join(root, 'events'), 'beforeRelease\n');
    },
  });
}
