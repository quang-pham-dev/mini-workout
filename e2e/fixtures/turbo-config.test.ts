import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('Admin CI builds its compiled workspace dependencies before Vite', async () => {
  const workflow = await readFile(
    new URL('../../.github/workflows/ci.yml', import.meta.url),
    'utf8',
  );
  const ui = JSON.parse(
    await readFile(
      new URL('../../packages/ui/package.json', import.meta.url),
      'utf8',
    ),
  ) as { exports?: { './data-table'?: { import?: string } } };

  assert.match(ui.exports?.['./data-table']?.import ?? '', /^\.\/dist\//);
  assert.match(
    workflow,
    /name: Build admin Nitro artifact\s+run: pnpm exec turbo run build --filter=@mini-workout\/admin\.\.\. --force/,
  );
  assert.doesNotMatch(
    workflow,
    /run: pnpm --filter @mini-workout\/admin build/,
  );
});

test('Storybook CI also builds workspace dependencies on a fresh checkout', async () => {
  const workflow = await readFile(
    new URL('../../.github/workflows/ci.yml', import.meta.url),
    'utf8',
  );
  assert.match(
    workflow,
    /name: Build Storybook\s+run: pnpm exec turbo run build --filter=@mini-workout\/storybook\.\.\./,
  );
  assert.doesNotMatch(
    workflow,
    /run: pnpm --filter @mini-workout\/storybook build/,
  );
});

test('web build includes every declared workspace dependency build', async () => {
  const configPath = new URL('../../apps/web/turbo.json', import.meta.url);
  const config = JSON.parse(await readFile(configPath, 'utf8')) as {
    tasks?: { build?: { dependsOn?: string[] } };
  };

  assert.ok(config.tasks?.build?.dependsOn?.includes('^build'));
});

test('root E2E task passes configurable server ports through strict env mode', async () => {
  const configPath = new URL('../../turbo.json', import.meta.url);
  const config = JSON.parse(await readFile(configPath, 'utf8')) as {
    tasks?: { 'test:e2e'?: { env?: string[] } };
  };

  assert.deepEqual(config.tasks?.['test:e2e']?.env, [
    'E2E_PUBLIC_PORT',
    'E2E_DATABASE_PORT',
    'E2E_ADMIN_PORT',
  ]);
});

test('Admin E2E selects Playwright projects in the package task, not Turbo CLI arguments', async () => {
  const root = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
  ) as { scripts?: Record<string, string> };
  const e2e = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { scripts?: Record<string, string> };
  const config = JSON.parse(
    await readFile(new URL('../../turbo.json', import.meta.url), 'utf8'),
  ) as { tasks?: Record<string, { dependsOn?: string[] }> };

  assert.equal(
    root.scripts?.['test:e2e:admin'],
    'turbo run test:e2e:admin --filter=@mini-workout/e2e',
  );
  assert.equal(
    e2e.scripts?.['test:e2e:admin'],
    'playwright test --project=admin --project=admin-mobile',
  );
  assert.deepEqual(config.tasks?.['test:e2e:admin']?.dependsOn, [
    '@mini-workout/web#build',
    '@mini-workout/admin#build',
  ]);
});

test('database E2E has a dedicated package task instead of forwarding project options through Turbo', async () => {
  const root = JSON.parse(
    await readFile(new URL('../../package.json', import.meta.url), 'utf8'),
  ) as { scripts?: Record<string, string> };
  const e2e = JSON.parse(
    await readFile(new URL('../package.json', import.meta.url), 'utf8'),
  ) as { scripts?: Record<string, string> };

  assert.equal(
    root.scripts?.['test:e2e:db'],
    'turbo run test:e2e:db --filter=@mini-workout/e2e',
  );
  assert.equal(e2e.scripts?.['test:e2e:db'], 'playwright test --project=db');
});
