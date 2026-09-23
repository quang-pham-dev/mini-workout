import { databaseRunKey } from './database-lock.ts';
import { existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export type CapturedAuthEmail = Readonly<{
  kind: 'verification' | 'password-reset';
  to: string;
  url: string;
  subject: string;
  text: string;
  html: string;
  createdAt: string;
}>;

export function emailCapturePath(databaseUrl: string): string {
  return join(
    tmpdir(),
    `mini-workout-e2e-email-${databaseRunKey(databaseUrl)}.jsonl`,
  );
}

export function readCapturedAuthEmails(
  databaseUrl: string,
): CapturedAuthEmail[] {
  const path = emailCapturePath(databaseUrl);
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8')
    .split('\n')
    .filter(Boolean)
    .map((line) => JSON.parse(line) as CapturedAuthEmail);
}

export function extractEmailToken(
  capturedEmail: CapturedAuthEmail,
): string | null {
  const url = new URL(capturedEmail.url);
  const searchToken = url.searchParams.get('token');
  if (searchToken) return searchToken;
  const pathSegment = url.pathname.split('/').at(-1);
  return pathSegment && pathSegment !== '' ? pathSegment : null;
}
