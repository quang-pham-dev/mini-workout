import { rmSync } from 'node:fs';

export async function withFixtureSetup<T>(
  authDirectory: string,
  release: () => void,
  setup: () => Promise<T>,
): Promise<T> {
  try {
    return await setup();
  } catch (error) {
    rmSync(authDirectory, { recursive: true, force: true });
    release();
    throw error;
  }
}
