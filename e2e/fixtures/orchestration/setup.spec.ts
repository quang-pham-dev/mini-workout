import {
  requestFixtureOwnership,
  requestFixturePreparation,
} from '../../coordinator.setup.ts';
import { prepareAuthState } from '../auth-setup.ts';
import { fixtureArtifactPaths, fixtureMetadata } from '../metadata.ts';
import { test } from '@playwright/test';
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

test('setup worker acquires coordinator ownership', async () => {
  const token = await requestFixtureOwnership();
  writeFileSync(
    `${process.env.CONTRACT_ROOT}/setup`,
    JSON.stringify({ pid: process.pid, token }),
  );
  const { authDirectory, metadataPath } = fixtureArtifactPaths(
    process.env.DATABASE_URL!,
    token,
    join(process.env.CONTRACT_ROOT!, 'auth'),
  );
  mkdirSync(authDirectory, { recursive: true });
  if (process.env.CONTRACT_SETUP_FAIL === 'metadata')
    throw new Error('original metadata failure');
  writeFileSync(
    metadataPath,
    JSON.stringify(fixtureMetadata(process.env.DATABASE_URL!, token)),
  );
  if (process.env.CONTRACT_SETUP_FAIL === 'api-creation')
    throw new Error('original api-creation failure');
  writeFileSync(join(authDirectory, 'active.json'), 'partial auth state');
  if (process.env.CONTRACT_SETUP_FAIL === 'kill-worker-command') {
    await requestFixturePreparation(token);
    throw new Error('long-running preparation unexpectedly completed');
  }
  if (
    ['interrupt-setup', 'kill-setup'].includes(
      process.env.CONTRACT_SETUP_FAIL ?? '',
    )
  ) {
    test.setTimeout(0);
    writeFileSync(join(process.env.CONTRACT_ROOT!, 'ready'), 'setup');
    await new Promise<void>(() => {});
  }
  let signups = 0;
  const stage = (name: string) => {
    appendFileSync(`${process.env.CONTRACT_ROOT}/auth-stages`, `${name}\n`);
    if (name === 'signup') signups++;
    if (
      process.env.CONTRACT_SETUP_FAIL === name &&
      (name !== 'signup' || signups === 2)
    ) {
      throw new Error(`original ${name} failure`);
    }
  };
  await prepareAuthState(
    {
      post: async (path) => {
        stage(path.includes('sign-up') ? 'signup' : 'signin');
        return { ok: () => true, status: () => 200 };
      },
      storageState: async () => {
        stage('storage-state');
      },
      dispose: async () => {
        if (
          ['signup', 'signin', 'storage-state'].includes(
            process.env.CONTRACT_SETUP_FAIL ?? '',
          )
        )
          throw new Error('secondary dispose failure');
      },
    },
    process.env.DATABASE_URL!,
    token,
    async () => {
      stage('configure');
    },
  );
});
