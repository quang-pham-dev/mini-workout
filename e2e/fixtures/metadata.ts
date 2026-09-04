import { databaseRunKey } from './database-lock.ts';

export type FixtureMetadata = { key: string; token: string };

export function fixtureMetadata(
  databaseUrl: string,
  token: string,
): FixtureMetadata {
  return { key: databaseRunKey(databaseUrl), token };
}
