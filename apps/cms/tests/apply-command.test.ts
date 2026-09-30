import { runApplyCommand } from '../src/migration/apply-command';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';

describe('Strapi migration apply command', () => {
  it('stops at migration blockers before requiring credentials or network', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'cms-apply-command-'));
    const manifestPath = join(directory, 'manifest.json');
    await writeFile(manifestPath, JSON.stringify(blockedManifest()));
    const output: string[] = [];
    const fetcher = vi.fn<typeof fetch>();

    const exitCode = await runApplyCommand({
      args: [manifestPath, directory],
      env: {},
      fetcher,
      writeOutput: (value) => output.push(value),
    });

    expect(exitCode).toBe(2);
    expect(fetcher).not.toHaveBeenCalled();
    expect(JSON.parse(output.join(''))).toMatchObject({
      mode: 'blocked',
      blockers: [{ code: 'REQUIRED_PRICING_MISSING', path: 'pricing' }],
    });
  });

  it('requires exact plan confirmation before apply mode', async () => {
    const output: string[] = [];
    const exitCode = await runApplyCommand({
      args: ['/manifest.json', '/media', '--apply'],
      env: {},
      fetcher: vi.fn<typeof fetch>(),
      writeOutput: (value) => output.push(value),
      loadInputs: vi.fn().mockResolvedValue({
        plan: readyPlan(),
        media: readyMedia(),
      }),
    });

    expect(exitCode).toBe(1);
    expect(output.join('')).toContain('PLAN_CONFIRMATION_REQUIRED');
    expect(output.join('')).not.toContain('undefined');
  });

  it('defaults to dry-run and never includes the API token in output', async () => {
    const output: string[] = [];
    const apply = vi.fn().mockResolvedValue({
      schemaVersion: 1,
      mode: 'dry-run',
      planRevision: 'plan-v1',
      actions: [],
      totals: { create: 0, update: 0, reuse: 0, upload: 0 },
    });
    const createClient = vi.fn().mockReturnValue({ apply });

    const exitCode = await runApplyCommand({
      args: ['/manifest.json', '/media'],
      env: {
        STRAPI_API_URL: 'https://studio.example.com',
        STRAPI_MIGRATION_TOKEN: 'super-secret-token',
      },
      fetcher: vi.fn<typeof fetch>(),
      writeOutput: (value) => output.push(value),
      loadInputs: vi.fn().mockResolvedValue({
        plan: readyPlan(),
        media: readyMedia(),
      }),
      createClient,
    });

    expect(exitCode).toBe(0);
    expect(apply).toHaveBeenCalledWith(
      expect.objectContaining({ dryRun: true }),
    );
    expect(output.join('')).not.toContain('super-secret-token');
  });
});

function readyPlan() {
  return {
    schemaVersion: 1 as const,
    sourceRevision: 'fixture-v1',
    planRevision: 'plan-v1',
    readyToApply: true,
    operations: [],
    blockers: [],
  };
}

function readyMedia() {
  return {
    schemaVersion: 1 as const,
    planRevision: 'plan-v1',
    readyToApply: true,
    assets: [],
    issues: [],
    remainingBlockers: [],
  };
}

function blockedManifest() {
  const base = { schemaVersion: 1, status: 'published' } as const;
  return {
    schemaVersion: 1,
    generatedAt: '2026-09-30T08:00:00.000Z',
    source: { provider: 'fixtures', revision: 'fixture-v1' },
    articles: [],
    campaigns: [],
    categories: [],
    pricing: null,
    marketingPages: [],
    siteSettings: { ...base, _type: 'siteSettings' },
    primaryNavigation: { ...base, _type: 'primaryNavigation' },
  };
}
