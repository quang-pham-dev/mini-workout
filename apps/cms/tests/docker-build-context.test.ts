import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

describe('CMS Docker build workspace inputs', () => {
  it('copies and builds shared contracts before compiling Strapi', async () => {
    const dockerfile = await readFile(
      new URL('../Dockerfile', import.meta.url),
      'utf8',
    );
    const installStep = dockerfile.indexOf(
      'RUN pnpm install --frozen-lockfile',
    );
    const cmsBuildStep = dockerfile.indexOf(
      'RUN pnpm --filter @mini-workout/cms build',
    );

    expect(dockerfile).toContain(
      'COPY packages/contracts/package.json packages/contracts/package.json',
    );
    expect(dockerfile).toContain('COPY packages/contracts packages/contracts');
    expect(
      dockerfile.indexOf('COPY packages/contracts/package.json'),
    ).toBeLessThan(installStep);
    expect(
      dockerfile.indexOf('COPY packages/contracts packages/contracts'),
    ).toBeLessThan(cmsBuildStep);
    expect(
      dockerfile.indexOf('RUN pnpm --filter @mini-workout/contracts build'),
    ).toBeLessThan(cmsBuildStep);
  });

  it('copies the actual Strapi admin client and TypeScript output', async () => {
    const dockerfile = await readFile(
      new URL('../Dockerfile', import.meta.url),
      'utf8',
    );

    expect(dockerfile).toContain(
      'cp -R apps/cms/.strapi/client /opt/cms/.strapi/client',
    );
    expect(dockerfile).toContain('cp -R apps/cms/dist /opt/cms/dist');
    expect(dockerfile).not.toContain('apps/cms/build');
  });
});
