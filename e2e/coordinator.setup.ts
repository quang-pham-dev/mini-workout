import { resolveDatabaseUrl } from './fixtures/database-env.ts';
import {
  type DatabaseLock,
  acquireDatabaseLock,
  assertSafeLockToken,
  isDatabaseLockOwner,
} from './fixtures/database-lock.ts';
import { cleanupDatabase } from './fixtures/database.ts';
import {
  fixtureArtifactPaths,
  removeFixtureMetadataIfOwned,
} from './fixtures/metadata.ts';
import { assertOwnedMutationUserEmail } from './fixtures/mutation-user-identity.ts';
import {
  type SetupCommand,
  startSetupCommand,
} from './fixtures/setup-command.ts';
import { withFixtureTeardown } from './fixtures/setup-lifecycle.ts';
import { randomUUID } from 'node:crypto';
import { rmSync } from 'node:fs';
import { createServer } from 'node:http';

async function readMutationEmail(request: NodeJS.ReadableStream) {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > 254) throw new Error('Mutation user claim is too large');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function startFixtureCoordinator(
  options: {
    lockDirectory?: string;
    authRoot?: string;
    commands?: SetupCommand[];
    commandTimeoutMs?: number;
    killProcess?: typeof process.kill;
    cleanupDatabase?: (
      databaseUrl: string,
      token: string,
      claimedEmails: readonly string[],
    ) => void | Promise<void>;
    beforeRelease?: (databaseUrl: string, token: string) => void;
  } = {},
): Promise<() => Promise<void>> {
  let lock: DatabaseLock | undefined;
  let databaseUrl: string;
  let activeCommand: ReturnType<typeof startSetupCommand> | undefined;
  let preparation: Promise<void> | undefined;
  let closing = false;
  let preparationCancelled = false;
  const claimedMutationEmails = new Set<string>();
  const secret = randomUUID();
  const server = createServer((request, response) => {
    const isAuthorized = request.headers.authorization === `Bearer ${secret}`;
    const isTokenRequest = request.method === 'GET' && request.url === '/token';
    const isMutationRequest =
      request.method === 'POST' &&
      ['/acquire', '/claim', '/prepare'].includes(request.url ?? '');
    if (!isAuthorized || (!isTokenRequest && !isMutationRequest)) {
      response.writeHead(403).end();
      return;
    }
    void (async () => {
      if (closing) throw new Error('Fixture coordinator is closing');
      if (isTokenRequest) {
        if (
          !lock ||
          !isDatabaseLockOwner(databaseUrl, lock.token, options.lockDirectory)
        )
          throw new Error('Fixture run token requires current ownership');
        response
          .writeHead(200, {
            'Cache-Control': 'no-store',
            'Content-Type': 'text/plain',
          })
          .end(lock.token);
        return;
      }
      if (request.url === '/acquire') {
        if (lock)
          throw new Error('Fixture ownership has already been requested');
        databaseUrl = resolveDatabaseUrl(process.env);
        lock = acquireDatabaseLock(databaseUrl, options.lockDirectory);
        response
          .writeHead(200, {
            'Cache-Control': 'no-store',
            'Content-Type': 'text/plain',
          })
          .end(lock.token);
        return;
      }
      if (request.url === '/claim') {
        if (
          !lock ||
          request.headers['x-e2e-run-token'] !== lock.token ||
          request.headers['content-type'] !== 'text/plain' ||
          !isDatabaseLockOwner(databaseUrl, lock.token, options.lockDirectory)
        )
          throw new Error('Mutation user claim requires current ownership');
        const email = await readMutationEmail(request);
        assertOwnedMutationUserEmail(email, lock.token);
        claimedMutationEmails.add(email);
        response.writeHead(204, { 'Cache-Control': 'no-store' }).end();
        return;
      }
      if (
        !lock ||
        request.headers['x-e2e-run-token'] !== lock.token ||
        !isDatabaseLockOwner(databaseUrl, lock.token, options.lockDirectory)
      )
        throw new Error('Fixture preparation requires owned run token');
      if (preparation)
        throw new Error('Fixture preparation has already been requested');
      response.once('close', () => {
        if (!response.writableEnded) {
          preparationCancelled = true;
          void activeCommand?.stop().catch(() => undefined);
        }
      });
      preparation = (async () => {
        const commands = options.commands ?? [
          {
            command: 'pnpm',
            args: [
              '--filter',
              '@mini-workout/web',
              'exec',
              'prisma',
              'migrate',
              'deploy',
            ],
          },
          {
            command: 'pnpm',
            args: ['--filter', '@mini-workout/web', 'db:seed'],
          },
        ];
        for (const command of commands) {
          if (closing || preparationCancelled)
            throw new Error('Fixture preparation cancelled');
          if (
            !isDatabaseLockOwner(
              databaseUrl,
              lock!.token,
              options.lockDirectory,
            )
          )
            throw new Error('Fixture preparation lost ownership');
          activeCommand = startSetupCommand(
            command,
            {
              ...process.env,
              DATABASE_URL: databaseUrl,
              E2E_DATABASE_URL: databaseUrl,
            },
            options.commandTimeoutMs,
            options.killProcess,
          );
          await activeCommand.finished;
          activeCommand = undefined;
        }
      })();
      await preparation;
      response.writeHead(200).end('prepared');
    })().catch((error: unknown) => {
      response
        .writeHead(409)
        .end(
          error instanceof Error ? error.message : 'Fixture acquisition failed',
        );
    });
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Missing coordinator address');
  const previousEndpoint = process.env.E2E_COORDINATOR_URL;
  const previousSecret = process.env.E2E_COORDINATOR_SECRET;
  process.env.E2E_COORDINATOR_URL = `http://127.0.0.1:${address.port}/acquire`;
  process.env.E2E_COORDINATOR_SECRET = secret;
  let finalization: Promise<void> | undefined;
  return () =>
    (finalization ??= (async () => {
      closing = true;
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
        server.closeAllConnections();
      });
      if (previousEndpoint === undefined)
        delete process.env.E2E_COORDINATOR_URL;
      else process.env.E2E_COORDINATOR_URL = previousEndpoint;
      if (previousSecret === undefined)
        delete process.env.E2E_COORDINATOR_SECRET;
      else process.env.E2E_COORDINATOR_SECRET = previousSecret;
      // This gate is outside teardown: uncertain writers prohibit ALL cleanup.
      await activeCommand?.stop();
      await preparation?.catch(() => undefined);
      // No setup project handshake means no fixture acquisition or cleanup.
      if (!lock) return;
      const ownedLock = lock;
      const { key, authDirectory, metadataPath } = fixtureArtifactPaths(
        databaseUrl,
        ownedLock.token,
        options.authRoot,
      );
      await withFixtureTeardown({
        ownsLock: () =>
          isDatabaseLockOwner(
            databaseUrl,
            ownedLock.token,
            options.lockDirectory,
          ),
        removeAuth: () =>
          rmSync(authDirectory, { recursive: true, force: true }),
        cleanupDatabase: () =>
          options.cleanupDatabase
            ? options.cleanupDatabase(databaseUrl, ownedLock.token, [
                ...claimedMutationEmails,
              ])
            : cleanupDatabase(databaseUrl, [...claimedMutationEmails]),
        removeMetadata: () =>
          removeFixtureMetadataIfOwned(metadataPath, key, ownedLock.token),
        release: () => {
          options.beforeRelease?.(databaseUrl, ownedLock.token);
          ownedLock.release();
        },
      });
    })());
}

async function coordinatorRequest(
  action: 'acquire' | 'claim' | 'prepare' | 'token',
  runToken?: string,
  body?: string,
): Promise<string> {
  const endpoint = process.env.E2E_COORDINATOR_URL;
  const secret = process.env.E2E_COORDINATOR_SECRET;
  if (!endpoint || !secret)
    throw new Error('DB setup requires the fixture coordinator');
  const url = new URL(endpoint);
  if (
    url.protocol !== 'http:' ||
    url.hostname !== '127.0.0.1' ||
    url.pathname !== '/acquire'
  )
    throw new Error('Invalid fixture coordinator endpoint');
  url.pathname = `/${action}`;
  const response = await fetch(url, {
    method: action === 'token' ? 'GET' : 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      ...(runToken === undefined ? {} : { 'X-E2E-Run-Token': runToken }),
      ...(body === undefined ? {} : { 'Content-Type': 'text/plain' }),
    },
    signal: AbortSignal.timeout(action === 'prepare' ? 270_000 : 10_000),
    redirect: 'error',
    body,
  });
  const token = await response.text();
  if (!response.ok) throw new Error(token);
  if (action === 'claim') {
    if (response.status !== 204 || token !== '')
      throw new Error('Invalid fixture coordinator claim response');
    return token;
  }
  if (
    action !== 'prepare' &&
    response.headers.get('content-type') !== 'text/plain'
  )
    throw new Error('Invalid fixture coordinator response content type');
  return token;
}

export async function requestFixtureOwnership(): Promise<string> {
  const token = await coordinatorRequest('acquire');
  assertSafeLockToken(token);
  return token;
}

export async function requestFixtureRunToken(): Promise<string> {
  const token = await coordinatorRequest('token');
  assertSafeLockToken(token);
  return token;
}

export async function requestFixturePreparation(token: string): Promise<void> {
  assertSafeLockToken(token);
  await coordinatorRequest('prepare', token);
}

export async function requestMutationUserClaim(
  token: string,
  email: string,
): Promise<void> {
  assertSafeLockToken(token);
  assertOwnedMutationUserEmail(email, token);
  await coordinatorRequest('claim', token, email);
}

export default async function globalSetup() {
  return startFixtureCoordinator();
}
