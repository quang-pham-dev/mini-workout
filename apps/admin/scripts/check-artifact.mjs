import { readFile, readdir, stat } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const defaultRoot = fileURLToPath(new URL('../.output/', import.meta.url));
const root =
  process.argv.length === 4 && process.argv[2] === '--root'
    ? resolve(process.argv[3])
    : defaultRoot;
if (process.argv.length !== 2 && process.argv.length !== 4) {
  throw new Error('Usage: check-artifact.mjs [--root <artifact-directory>]');
}
const platformEngine =
  process.platform === 'darwin'
    ? process.arch === 'arm64'
      ? /^libquery_engine-darwin-arm64\.dylib\.node$/
      : /^libquery_engine-darwin\.dylib\.node$/
    : process.platform === 'linux'
      ? process.arch === 'arm64'
        ? /^libquery_engine-linux-arm64-openssl-3\.0\.x\.so\.node$/
        : /^libquery_engine-debian-openssl-3\.0\.x\.so\.node$/
      : process.platform === 'win32'
        ? /^query_engine-windows\.dll\.node$/
        : undefined;
if (!platformEngine) {
  throw new Error(`Unsupported Prisma artifact platform: ${process.platform}`);
}
const files = [];
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else if (entry.isFile() && (await stat(path)).size > 0) {
        files.push(relative(root, path).split(sep).join('/'));
      }
    }),
  );
}
await walk(root);
const serverFiles = files.filter((file) => file.startsWith('server/'));
const posthogKey = process.env.ADMIN_POSTHOG_KEY?.trim();
if (posthogKey) {
  const leakedFiles = [];
  for (const file of serverFiles) {
    const contents = await readFile(join(root, file), 'utf8');
    if (contents.includes(posthogKey)) leakedFiles.push(file);
  }
  if (leakedFiles.length) {
    throw new Error(
      `PostHog public key must not be bundled in the admin server artifact: ${leakedFiles.join(', ')}`,
    );
  }
}
const expectedFiles = [
  'server/index.mjs',
  'server/node_modules/@prisma/client/default.js',
  'server/node_modules/@prisma/client/runtime/library.js',
  'server/node_modules/.prisma/client/default.js',
];
const missing = expectedFiles.filter((file) => !files.includes(file));
const hasEngine = files.some((file) => {
  const prefix = 'server/node_modules/.prisma/client/';
  return (
    file.startsWith(prefix) && platformEngine.test(file.slice(prefix.length))
  );
});
if (missing.length || !hasEngine) {
  throw new Error(
    `Incomplete Nitro Prisma artifact: missing=${missing.join(',') || 'none'}, platform-engine=${hasEngine}`,
  );
}

const databaseUrl = process.env.E2E_DATABASE_URL;
if (databaseUrl) {
  if (!databaseUrl || databaseUrl !== process.env.DATABASE_URL) {
    throw new Error(
      'Runtime smoke requires matching disposable E2E database URLs.',
    );
  }
  const parsed = new URL(databaseUrl);
  if (
    !['127.0.0.1', 'localhost', '[::1]'].includes(parsed.hostname) ||
    parsed.pathname !== '/mini_workout_e2e'
  ) {
    throw new Error(
      'Runtime smoke requires a loopback mini_workout_e2e database.',
    );
  }
  let prisma;
  try {
    const require = createRequire(join(root, 'server/index.mjs'));
    const { PrismaClient } = require('@prisma/client');
    prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
  } catch (error) {
    const code =
      error &&
      typeof error === 'object' &&
      'errorCode' in error &&
      error.errorCode
        ? String(error.errorCode)
        : error && typeof error === 'object' && 'code' in error && error.code
          ? String(error.code)
          : error instanceof Error
            ? error.name
            : 'unknown';
    throw new Error(`Bundled Prisma runtime smoke failed (${code}).`);
  } finally {
    try {
      await prisma?.$disconnect();
    } catch {
      // The query error is the primary diagnostic; disconnect can repeat it.
    }
  }
  console.log(
    'Nitro artifact Prisma runtime connected to disposable PostgreSQL.',
  );
} else {
  console.log('Nitro artifact contains the native Prisma client and engine.');
}
