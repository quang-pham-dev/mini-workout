import { rmSync } from 'node:fs';

export async function withFixtureSetup<T>(
  authDirectory: string,
  removeMetadata: () => void,
  release: () => void,
  setup: () => Promise<T>,
): Promise<T> {
  try {
    return await setup();
  } catch (error) {
    await withFixtureTeardown(
      () => rmSync(authDirectory, { recursive: true, force: true }),
      () => undefined,
      release,
      removeMetadata,
    ).catch(() => undefined);
    throw error;
  }
}

export async function withFixtureTeardown(
  removeAuth: () => void | Promise<void>,
  cleanupDatabase: () => void | Promise<void>,
  release: () => void | Promise<void>,
  removeMetadata: () => void | Promise<void>,
): Promise<void> {
  let firstError: unknown;
  for (const cleanup of [
    removeAuth,
    cleanupDatabase,
    release,
    removeMetadata,
  ]) {
    try {
      await cleanup();
    } catch (error) {
      firstError ??= error;
    }
  }
  if (firstError !== undefined) throw firstError;
}
