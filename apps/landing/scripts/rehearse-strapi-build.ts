import { createPublishedContentRepository } from '../src/content/published-content-repository.js';
import { createStrapiContentSource } from '../src/content/strapi/content-source.js';
import {
  createLocalStrapiSnapshot,
  startLocalStrapiSnapshotServer,
} from '../tests/support/local-strapi-snapshot-server.js';
import { execFile } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const token = 'local-strapi-build-rehearsal';
const baseline = await createPublishedContentRepository({
  contentSource: 'fixtures',
}).load();
const rehearsal = createLocalStrapiSnapshot(baseline);
const server = await startLocalStrapiSnapshotServer({
  token,
  snapshot: rehearsal.transport,
});
const outputRoot = await mkdtemp(join(tmpdir(), 'landing-strapi-build-'));

async function build(output: 'static' | 'preview'): Promise<void> {
  const result = await execFileAsync(
    'pnpm',
    ['exec', 'astro', 'build', '--outDir', join(outputRoot, output)],
    {
      env: {
        ...process.env,
        LANDING_ANALYTICS_ENABLED: 'false',
        LANDING_CONTENT_SOURCE: 'strapi',
        LANDING_INDEXING_ENABLED: 'false',
        LANDING_OUTPUT: output,
        LANDING_SITE_URL: 'https://landing.local.example',
        MEMBER_APP_URL: 'https://members.local.example',
        STRAPI_API_READ_TOKEN: token,
        STRAPI_API_URL: server.apiUrl,
      },
      maxBuffer: 10 * 1024 * 1024,
    },
  );
  if (result.stdout.trim()) process.stdout.write(result.stdout);
  if (result.stderr.trim()) process.stderr.write(result.stderr);
  console.log(`Local Strapi ${output} build passed.`);
}

try {
  await build('static');
  await createStrapiContentSource({
    apiUrl: server.apiUrl,
    token,
    preview: true,
  }).load();
  await build('preview');
  const requests = server.requests();
  if (
    requests.unauthorized !== 0 ||
    requests.authorized < 2 ||
    requests.preview !== 1
  ) {
    throw new Error('Local Strapi build rehearsal request contract failed.');
  }
  console.log(
    `Local Strapi build rehearsal passed (${requests.authorized} authenticated snapshot requests; ${requests.preview} preview).`,
  );
} finally {
  await server.close();
  await rm(outputRoot, { recursive: true, force: true });
}
