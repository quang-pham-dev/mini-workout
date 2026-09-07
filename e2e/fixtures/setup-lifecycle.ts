export type FixtureCleanup = {
  ownsLock: () => boolean;
  removeAuth: () => void | Promise<void>;
  cleanupDatabase: () => void | Promise<void>;
  removeMetadata: () => void | Promise<void>;
  release: () => void | Promise<void>;
};

export async function withFixtureSetup<T>(
  cleanup: FixtureCleanup,
  setup: () => Promise<T>,
): Promise<T> {
  try {
    return await setup();
  } catch (error) {
    const errors: unknown[] = [error];
    try {
      await withFixtureTeardown(cleanup);
    } catch (cleanupError) {
      errors.push(
        ...(cleanupError instanceof AggregateError
          ? cleanupError.errors
          : [cleanupError]),
      );
    }
    throw new AggregateError(errors, 'Fixture setup or cleanup failed', {
      cause: error,
    });
  }
}

export async function withFixtureTeardown(
  callbacks: FixtureCleanup,
): Promise<void> {
  const errors: unknown[] = [];
  for (const cleanup of [
    callbacks.removeAuth,
    callbacks.cleanupDatabase,
    callbacks.removeMetadata,
    callbacks.release,
  ]) {
    try {
      if (!callbacks.ownsLock()) break;
      await cleanup();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length > 0)
    throw new AggregateError(errors, 'Fixture cleanup failed', {
      cause: errors[0],
    });
}
