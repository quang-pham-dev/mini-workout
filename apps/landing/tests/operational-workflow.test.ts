import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('Landing operational audit workflow', () => {
  const workflow = readFileSync(
    resolve(process.cwd(), '../../.github/workflows/landing-operations.yml'),
    'utf8',
  );

  it('runs on a schedule and manually with least-privilege defaults', () => {
    expect(workflow).toContain("cron: '17 6 * * *'");
    expect(workflow).toContain('workflow_dispatch:');
    expect(workflow).toContain('contents: read');
    expect(workflow).toContain('timeout-minutes: 10');
    expect(workflow).toContain('cancel-in-progress: false');
    expect(workflow).not.toContain('contents: write');
  });

  it('uses repository preparation and the owned workspace command', () => {
    expect(workflow).toContain('uses: ./.github/composite-actions/prepare');
    expect(workflow).toContain('run: pnpm check:landing-operations');
    expect(workflow).toContain(
      "vars.LANDING_AUDIT_CONTENT_SOURCE || 'fixtures'",
    );
    expect(workflow).not.toContain('SANITY_API_READ_TOKEN');
  });
});
