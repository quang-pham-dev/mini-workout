import { databaseRunKey } from './database-lock.ts';
import { readFileSync, rmSync } from 'node:fs';

export type FixtureMetadata = { key: string; token: string };
const keyPattern = /^[0-9a-f]{64}$/;
const tokenPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function fixtureMetadata(
  databaseUrl: string,
  token: string,
): FixtureMetadata {
  return { key: databaseRunKey(databaseUrl), token };
}

export function parseFixtureMetadata(
  value: unknown,
  expectedKey: string,
): FixtureMetadata {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('E2E fixture metadata is malformed');
  }
  const metadata = value as Record<string, unknown>;
  if (
    Object.keys(metadata).length !== 2 ||
    metadata.key !== expectedKey ||
    typeof metadata.key !== 'string' ||
    !keyPattern.test(metadata.key) ||
    typeof metadata.token !== 'string' ||
    !tokenPattern.test(metadata.token)
  )
    throw new Error('E2E fixture metadata is malformed');
  return { key: metadata.key, token: metadata.token };
}

export function removeFixtureMetadataIfOwned(
  path: string,
  expectedKey: string,
  token: string,
): void {
  try {
    const metadata = parseFixtureMetadata(
      JSON.parse(readFileSync(path, 'utf8')),
      expectedKey,
    );
    if (metadata.token === token) rmSync(path, { force: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  }
}
