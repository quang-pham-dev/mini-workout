import { strict as assert } from 'node:assert';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('web build includes every declared workspace dependency build', async () => {
  const configPath = new URL('../../apps/web/turbo.json', import.meta.url);
  const config = JSON.parse(await readFile(configPath, 'utf8')) as {
    tasks?: { build?: { dependsOn?: string[] } };
  };

  assert.ok(config.tasks?.build?.dependsOn?.includes('^build'));
});
