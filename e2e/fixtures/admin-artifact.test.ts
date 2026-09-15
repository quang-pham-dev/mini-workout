import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const checker = fileURLToPath(
  new URL('../../apps/admin/scripts/check-artifact.mjs', import.meta.url),
);

function runChecker(root: string, environment: Record<string, string> = {}) {
  return spawnSync(process.execPath, [checker, '--root', root], {
    encoding: 'utf8',
    env: environment,
  });
}

function createArtifact(root: string, engineName: string) {
  for (const name of [
    'server/index.mjs',
    'server/node_modules/@prisma/client/default.js',
    'server/node_modules/@prisma/client/runtime/library.js',
    'server/node_modules/.prisma/client/default.js',
    `server/node_modules/.prisma/client/${engineName}`,
  ]) {
    const path = join(root, name);
    mkdirSync(join(path, '..'), { recursive: true });
    writeFileSync(path, 'artifact fixture');
  }
}

test('rejects an artifact containing only a Prisma engine for the wrong platform', () => {
  const root = mkdtempSync(join(tmpdir(), 'mini-workout-artifact-'));
  try {
    const wrongEngine =
      process.platform === 'darwin'
        ? 'libquery_engine-debian-openssl-3.0.x.so.node'
        : 'libquery_engine-darwin.dylib.node';
    createArtifact(root, wrongEngine);
    const result = runChecker(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /engine/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('accepts the complete Prisma client and native engine for the current platform', () => {
  const root = mkdtempSync(join(tmpdir(), 'mini-workout-artifact-'));
  try {
    const engine =
      process.platform === 'darwin'
        ? process.arch === 'arm64'
          ? 'libquery_engine-darwin-arm64.dylib.node'
          : 'libquery_engine-darwin.dylib.node'
        : process.arch === 'arm64'
          ? 'libquery_engine-linux-arm64-openssl-3.0.x.so.node'
          : 'libquery_engine-debian-openssl-3.0.x.so.node';
    createArtifact(root, engine);
    const result = runChecker(root);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('does not probe a configured application database without an explicit E2E URL', () => {
  const root = mkdtempSync(join(tmpdir(), 'mini-workout-artifact-'));
  try {
    const engine =
      process.platform === 'darwin'
        ? process.arch === 'arm64'
          ? 'libquery_engine-darwin-arm64.dylib.node'
          : 'libquery_engine-darwin.dylib.node'
        : process.arch === 'arm64'
          ? 'libquery_engine-linux-arm64-openssl-3.0.x.so.node'
          : 'libquery_engine-debian-openssl-3.0.x.so.node';
    createArtifact(root, engine);
    const result = runChecker(root, {
      DATABASE_URL: 'postgresql://owner:secret@production.example/app',
    });
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('fails a runtime smoke when the disposable database is unavailable', () => {
  const root = mkdtempSync(join(tmpdir(), 'mini-workout-artifact-'));
  try {
    const engine =
      process.platform === 'darwin'
        ? process.arch === 'arm64'
          ? 'libquery_engine-darwin-arm64.dylib.node'
          : 'libquery_engine-darwin.dylib.node'
        : process.arch === 'arm64'
          ? 'libquery_engine-linux-arm64-openssl-3.0.x.so.node'
          : 'libquery_engine-debian-openssl-3.0.x.so.node';
    createArtifact(root, engine);
    const url = 'postgresql://postgres:postgres@127.0.0.1:1/mini_workout_e2e';
    const result = runChecker(root, {
      DATABASE_URL: url,
      E2E_DATABASE_URL: url,
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /runtime|Prisma/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
