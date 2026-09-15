import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../.output/', import.meta.url));
const files = [];
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await walk(path);
      else files.push(path);
    }),
  );
}
await walk(root);
const hasClient = files.some(
  (file) =>
    file.includes('@prisma/client/') && /(?:default|library)\.js$/.test(file),
);
const hasEngine = files.some((file) =>
  /(?:lib)?query_engine|schema-engine/.test(file),
);
if (!hasClient || !hasEngine) {
  console.error(
    `Incomplete Nitro Prisma artifact: client=${hasClient}, engine=${hasEngine}`,
  );
  process.exit(1);
}
console.log('Nitro artifact contains Prisma client and engine.');
