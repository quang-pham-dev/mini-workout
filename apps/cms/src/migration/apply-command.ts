import { createStrapiImportPlan } from './import-plan';
import { resolveMigrationMedia } from './media-resolver';
import type { MediaResolutionReport } from './media-resolver';
import {
  StrapiApplyError,
  createStrapiApplyClient,
} from './strapi-apply-client';
import type {
  StrapiApplyInput,
  StrapiApplyReport,
} from './strapi-apply-client';
import { readFile } from 'node:fs/promises';

type ApplyClient = {
  apply(input: StrapiApplyInput): Promise<StrapiApplyReport>;
};

interface LoadedInputs {
  readonly plan: StrapiApplyInput['plan'];
  readonly media: MediaResolutionReport;
}

interface ApplyCommandOptions {
  readonly args: readonly string[];
  readonly env: NodeJS.ProcessEnv;
  readonly fetcher: typeof fetch;
  readonly writeOutput: (value: string) => void;
  readonly loadInputs?: (
    manifestPath: string,
    mediaRoot: string,
  ) => Promise<LoadedInputs>;
  readonly createClient?: (input: {
    apiUrl: string;
    token: string;
    fetcher: typeof fetch;
  }) => ApplyClient;
}

async function defaultLoadInputs(
  manifestPath: string,
  mediaRoot: string,
): Promise<LoadedInputs> {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as unknown;
  const plan = createStrapiImportPlan(manifest);
  return {
    plan,
    media: await resolveMigrationMedia(plan, mediaRoot),
  };
}

function output(
  writeOutput: ApplyCommandOptions['writeOutput'],
  value: unknown,
): void {
  writeOutput(`${JSON.stringify(value, null, 2)}\n`);
}

export async function runApplyCommand(
  options: ApplyCommandOptions,
): Promise<number> {
  const manifestPath = options.args.find((value) => !value.startsWith('--'));
  const mediaRoot = options.args.find(
    (value, index) => index > 0 && !value.startsWith('--'),
  );
  if (!manifestPath || !mediaRoot) {
    output(options.writeOutput, {
      mode: 'error',
      code: 'INPUT_INVALID',
      message: 'Manifest path and media root are required.',
    });
    return 1;
  }

  try {
    const loadInputs = options.loadInputs ?? defaultLoadInputs;
    const { plan, media } = await loadInputs(manifestPath, mediaRoot);
    if (!plan.readyToApply || !media.readyToApply) {
      output(options.writeOutput, {
        mode: 'blocked',
        planRevision: plan.planRevision,
        blockers: [...media.remainingBlockers, ...media.issues],
      });
      return 2;
    }

    const applyMode = options.args.includes('--apply');
    const confirmedRevision = options.args
      .find((value) => value.startsWith('--confirm-plan='))
      ?.slice('--confirm-plan='.length);
    if (applyMode && confirmedRevision !== plan.planRevision) {
      output(options.writeOutput, {
        mode: 'error',
        code: 'PLAN_CONFIRMATION_REQUIRED',
        message: 'Apply requires --confirm-plan=<current plan revision>.',
        planRevision: plan.planRevision,
      });
      return 1;
    }

    const apiUrl = options.env.STRAPI_API_URL?.trim();
    const token = options.env.STRAPI_MIGRATION_TOKEN?.trim();
    if (!apiUrl || !token) {
      output(options.writeOutput, {
        mode: 'error',
        code: 'CONFIG_INVALID',
        message:
          'STRAPI_API_URL and STRAPI_MIGRATION_TOKEN must be configured.',
      });
      return 1;
    }

    const createClient = options.createClient ?? createStrapiApplyClient;
    const client = createClient({ apiUrl, token, fetcher: options.fetcher });
    const report = await client.apply({
      dryRun: !applyMode,
      plan,
      media,
    });
    output(options.writeOutput, report);
    return 0;
  } catch (cause) {
    const code =
      cause instanceof StrapiApplyError ? cause.code : 'INTERNAL_ERROR';
    output(options.writeOutput, {
      mode: 'error',
      code,
      message: 'Strapi migration apply did not complete.',
    });
    return 1;
  }
}
