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
    try {
      rmSync(authDirectory, { recursive: true, force: true });
    } catch {
      // Preserve the setup error while continuing all cleanup attempts.
    } finally {
      try {
        removeMetadata();
      } catch {
        // Preserve the setup error while continuing all cleanup attempts.
      } finally {
        try {
          release();
        } catch {
          // Preserve the setup error.
        }
      }
    }
    throw error;
  }
}
