import {
  requestFixtureOwnership,
  requestFixturePreparation,
} from './coordinator.setup.ts';
import { authRequestOptions } from './fixtures/auth-request.ts';
import { prepareAuthState } from './fixtures/auth-setup.ts';
import { resolveDatabaseUrl } from './fixtures/database-env.ts';
import { prepareDatabase } from './fixtures/database.ts';
import { fixtureArtifactPaths, fixtureMetadata } from './fixtures/metadata.ts';
import { databaseBaseURL } from './playwright.config.ts';
import { request, test } from '@playwright/test';
import { mkdirSync, renameSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

test('prepare deterministic database fixtures', async () => {
  test.setTimeout(300_000);
  const databaseUrl = resolveDatabaseUrl(process.env);
  const token = await requestFixtureOwnership();
  const { authDirectory, metadataPath } = fixtureArtifactPaths(
    databaseUrl,
    token,
  );
  mkdirSync(authDirectory, { recursive: true });
  const temporaryPath = join(authDirectory, 'metadata.tmp');
  writeFileSync(
    temporaryPath,
    JSON.stringify(fixtureMetadata(databaseUrl, token)),
    'utf8',
  );
  renameSync(temporaryPath, metadataPath);
  await requestFixturePreparation(token);
  await prepareDatabase(databaseUrl);
  const api = await request.newContext(authRequestOptions(databaseBaseURL));
  // The coordinator finalizer also cleans partial signup/state failures.
  await prepareAuthState(api, databaseUrl, token);
});
