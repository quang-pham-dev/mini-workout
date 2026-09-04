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
      removeMetadata,
      release,
    ).catch(() => undefined);
    throw error;
  }
}

export async function withFixtureTeardown(
  removeAuth: () => void | Promise<void>,
  removeMetadata: () => void | Promise<void>,
  release: () => void | Promise<void>,
): Promise<void> {
  let firstError: unknown;
  for (const cleanup of [removeAuth, removeMetadata, release]) {
    try {
      await cleanup();
    } catch (error) {
      firstError ??= error;
    }
  }
  if (firstError !== undefined) throw firstError;
}
