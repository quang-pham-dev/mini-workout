import type {
  MigrationImportOperation,
  MigrationImportPlan,
  MigrationOperationKind,
} from './import-plan';
import type {
  MediaResolutionReport,
  ResolvedMigrationMedia,
} from './media-resolver';
import { readFile } from 'node:fs/promises';
import { extname } from 'node:path';

type ApplyAction = 'create' | 'update' | 'reuse' | 'upload';

interface CollectionSpec {
  readonly endpoint: string;
  readonly stableField: string;
  readonly draft: boolean;
}

const collectionSpecs: Partial<Record<MigrationOperationKind, CollectionSpec>> =
  {
    author: { endpoint: 'authors', stableField: 'name', draft: false },
    category: { endpoint: 'categories', stableField: 'slug', draft: true },
    article: { endpoint: 'articles', stableField: 'slug', draft: true },
    campaign: { endpoint: 'campaigns', stableField: 'campaignId', draft: true },
    'marketing-page': {
      endpoint: 'marketing-pages',
      stableField: 'slug',
      draft: true,
    },
  };

const singleSpecs: Partial<Record<MigrationOperationKind, string>> = {
  'pricing-page': 'pricing-page',
  'site-settings': 'site-setting',
  'primary-navigation': 'primary-navigation',
};

const dynamicZoneComponents: Record<string, string> = {
  'prose.v1': 'article.prose-v1',
  'pullQuote.v1': 'article.pull-quote-v1',
  'campaignHero.v1': 'campaign.hero-v1',
  'campaignBenefits.v1': 'campaign.benefits-v1',
  'campaignFaq.v1': 'campaign.faq-v1',
  'campaignCta.v1': 'campaign.cta-v1',
};

export class StrapiApplyError extends Error {
  readonly cause?: unknown;
  readonly category: 'validation' | 'conflict' | 'dependency' | 'configuration';
  readonly code:
    | 'INPUT_INVALID'
    | 'RESOURCE_CONFLICT'
    | 'DEPENDENCY_UNAVAILABLE'
    | 'CONFIG_INVALID';

  constructor(input: {
    category: StrapiApplyError['category'];
    code: StrapiApplyError['code'];
    message: string;
    cause?: unknown;
  }) {
    super(input.message);
    this.name = 'StrapiApplyError';
    this.category = input.category;
    this.code = input.code;
    this.cause = input.cause;
  }
}

export interface StrapiApplyAction {
  readonly kind: MigrationOperationKind;
  readonly key: string;
  readonly action: ApplyAction;
}

export interface StrapiApplyReport {
  readonly schemaVersion: 1;
  readonly mode: 'dry-run' | 'apply';
  readonly planRevision: string;
  readonly actions: readonly StrapiApplyAction[];
  readonly totals: Readonly<Record<ApplyAction, number>>;
}

export interface StrapiApplyInput {
  readonly dryRun: boolean;
  readonly plan: MigrationImportPlan;
  readonly media: MediaResolutionReport;
}

interface ClientOptions {
  readonly apiUrl: string;
  readonly token: string;
  readonly fetcher?: typeof fetch;
}

interface StrapiDocument {
  readonly documentId: string;
}

interface StrapiMedia {
  readonly id: number;
  readonly name: string;
}

function validateOptions(options: ClientOptions): URL {
  let apiUrl: URL;
  try {
    apiUrl = new URL(options.apiUrl);
  } catch (cause) {
    throw new StrapiApplyError({
      category: 'configuration',
      code: 'CONFIG_INVALID',
      message: 'Strapi migration API URL is invalid.',
      cause,
    });
  }
  if (
    !['http:', 'https:'].includes(apiUrl.protocol) ||
    apiUrl.username ||
    apiUrl.password ||
    !options.token.trim()
  ) {
    throw new StrapiApplyError({
      category: 'configuration',
      code: 'CONFIG_INVALID',
      message: 'Strapi migration client configuration is invalid.',
    });
  }
  return apiUrl;
}

function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new StrapiApplyError({
      category: 'validation',
      code: 'INPUT_INVALID',
      message: 'Migration data is invalid.',
    });
  }
  return value as Record<string, unknown>;
}

async function json(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function deterministicMediaName(asset: ResolvedMigrationMedia): string {
  return `migration-${asset.sha256}${extname(asset.filePath).toLowerCase()}`;
}

function countActions(actions: readonly StrapiApplyAction[]) {
  return actions.reduce<Record<ApplyAction, number>>(
    (totals, { action }) => ({ ...totals, [action]: totals[action] + 1 }),
    { create: 0, update: 0, reuse: 0, upload: 0 },
  );
}

function assertReady(input: StrapiApplyInput): void {
  if (
    !input.plan.readyToApply ||
    !input.media.readyToApply ||
    input.plan.planRevision !== input.media.planRevision
  ) {
    throw new StrapiApplyError({
      category: 'validation',
      code: 'INPUT_INVALID',
      message: 'Migration plan is not ready to apply.',
    });
  }
}

export function createStrapiApplyClient(options: ClientOptions) {
  const apiUrl = validateOptions(options);
  const fetcher = options.fetcher ?? fetch;
  const baseUrl = new URL('/api/', apiUrl);

  async function request(
    path: string,
    init: RequestInit,
    accepted: readonly number[] = [200],
  ): Promise<{ readonly response: Response; readonly body: unknown }> {
    let response: Response;
    try {
      response = await fetcher(new URL(path, baseUrl), {
        ...init,
        headers: {
          Authorization: `Bearer ${options.token}`,
          ...init.headers,
        },
      });
    } catch (cause) {
      throw new StrapiApplyError({
        category: 'dependency',
        code: 'DEPENDENCY_UNAVAILABLE',
        message: 'Strapi migration dependency is unavailable.',
        cause,
      });
    }
    const body = await json(response);
    if (!accepted.includes(response.status)) {
      throw new StrapiApplyError({
        category: 'dependency',
        code: 'DEPENDENCY_UNAVAILABLE',
        message: 'Strapi migration dependency rejected the request.',
      });
    }
    return { response, body };
  }

  async function findCollection(
    operation: MigrationImportOperation,
    spec: CollectionSpec,
  ): Promise<StrapiDocument | null> {
    const query = new URLSearchParams({
      [`filters[${spec.stableField}][$eq]`]: operation.key,
      'pagination[pageSize]': '2',
      ...(spec.draft ? { status: 'draft' } : {}),
    });
    const { body } = await request(`${spec.endpoint}?${query}`, {
      method: 'GET',
    });
    const data = record(body).data;
    if (!Array.isArray(data)) {
      throw new StrapiApplyError({
        category: 'dependency',
        code: 'DEPENDENCY_UNAVAILABLE',
        message: 'Strapi returned an invalid migration response.',
      });
    }
    if (data.length > 1) {
      throw new StrapiApplyError({
        category: 'conflict',
        code: 'RESOURCE_CONFLICT',
        message: 'Multiple Strapi documents share a migration stable key.',
      });
    }
    if (data.length === 0) return null;
    const documentId = record(data[0]).documentId;
    if (typeof documentId !== 'string' || !documentId) {
      throw new StrapiApplyError({
        category: 'dependency',
        code: 'DEPENDENCY_UNAVAILABLE',
        message: 'Strapi returned an invalid migration response.',
      });
    }
    return { documentId };
  }

  async function findSingle(endpoint: string): Promise<StrapiDocument | null> {
    const { response, body } = await request(
      `${endpoint}?status=draft`,
      { method: 'GET' },
      [200, 404],
    );
    if (response.status === 404) return null;
    const data = record(body).data;
    if (!data) return null;
    const documentId = record(data).documentId;
    return typeof documentId === 'string' ? { documentId } : null;
  }

  async function findMedia(name: string): Promise<StrapiMedia | null> {
    const query = new URLSearchParams({
      'filters[name][$eq]': name,
      'pagination[pageSize]': '2',
    });
    const { body } = await request(`upload/files/page?${query}`, {
      method: 'GET',
    });
    const data = record(body).data;
    if (!Array.isArray(data)) {
      throw new StrapiApplyError({
        category: 'dependency',
        code: 'DEPENDENCY_UNAVAILABLE',
        message: 'Strapi returned an invalid media response.',
      });
    }
    if (data.length > 1) {
      throw new StrapiApplyError({
        category: 'conflict',
        code: 'RESOURCE_CONFLICT',
        message: 'Multiple Strapi media assets share a migration checksum.',
      });
    }
    if (data.length === 0) return null;
    const candidate = record(data[0]);
    return typeof candidate.id === 'number' &&
      typeof candidate.name === 'string'
      ? { id: candidate.id, name: candidate.name }
      : null;
  }

  async function uploadMedia(
    operation: MigrationImportOperation,
    asset: ResolvedMigrationMedia,
  ): Promise<StrapiMedia> {
    const payload = operation.payload;
    const form = new FormData();
    form.append(
      'files',
      new Blob([await readFile(asset.filePath)], { type: asset.mimeType }),
      deterministicMediaName(asset),
    );
    form.append(
      'fileInfo',
      JSON.stringify({
        name: deterministicMediaName(asset),
        alternativeText:
          typeof payload.alt === 'string' ? payload.alt : undefined,
        caption:
          typeof payload.caption === 'string' ? payload.caption : undefined,
      }),
    );
    const { body } = await request(
      'upload',
      { method: 'POST', body: form },
      [200, 201],
    );
    if (!Array.isArray(body) || body.length !== 1) {
      throw new StrapiApplyError({
        category: 'dependency',
        code: 'DEPENDENCY_UNAVAILABLE',
        message: 'Strapi returned an invalid media upload response.',
      });
    }
    const uploaded = record(body[0]);
    if (typeof uploaded.id !== 'number' || typeof uploaded.name !== 'string') {
      throw new StrapiApplyError({
        category: 'dependency',
        code: 'DEPENDENCY_UNAVAILABLE',
        message: 'Strapi returned an invalid media upload response.',
      });
    }
    return { id: uploaded.id, name: uploaded.name };
  }

  function transformValue(
    value: unknown,
    references: ReadonlyMap<string, string | number>,
  ): unknown {
    if (Array.isArray(value)) {
      return value.map((item) => transformValue(item, references));
    }
    if (!value || typeof value !== 'object') return value;
    const source = record(value);
    if (
      typeof source.src === 'string' &&
      typeof source.alt === 'string' &&
      Number.isInteger(source.width) &&
      Number.isInteger(source.height)
    ) {
      const mediaId = references.get(`media:${source.src}`);
      if (typeof mediaId !== 'number') {
        throw new StrapiApplyError({
          category: 'validation',
          code: 'INPUT_INVALID',
          message: 'Migration media reference is unresolved.',
        });
      }
      return {
        image: mediaId,
        alt: source.alt,
        caption: typeof source.caption === 'string' ? source.caption : '',
      };
    }

    const output: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(source)) {
      if (['_key', '_type', 'canonicalPath', 'key', 'status'].includes(key)) {
        continue;
      }
      output[key] = transformValue(child, references);
    }
    if (
      typeof source._type === 'string' &&
      dynamicZoneComponents[source._type]
    ) {
      output.__component = dynamicZoneComponents[source._type];
    }
    return output;
  }

  function transformPayload(
    operation: MigrationImportOperation,
    references: ReadonlyMap<string, string | number>,
  ): Record<string, unknown> {
    const transformed = record(transformValue(operation.payload, references));
    if (operation.kind === 'author') {
      transformed.entityType =
        operation.payload.entityType ??
        operation.payload.type ??
        'Organization';
      delete transformed.type;
    }
    if (operation.kind === 'article') {
      const category = references.get(
        `category:${String(record(operation.payload.category).slug)}`,
      );
      const author = references.get(
        `author:${String(record(operation.payload.author).name)}`,
      );
      if (typeof category !== 'string' || typeof author !== 'string') {
        throw new StrapiApplyError({
          category: 'validation',
          code: 'INPUT_INVALID',
          message: 'Migration document reference is unresolved.',
        });
      }
      transformed.category = category;
      transformed.author = author;
    }
    if (operation.kind === 'pricing-page' && Array.isArray(transformed.plans)) {
      transformed.plans = transformed.plans.map((value) => ({
        ...record(value),
        enabled: record(value).enabled !== false,
      }));
    }
    return transformed;
  }

  async function apply(input: StrapiApplyInput): Promise<StrapiApplyReport> {
    assertReady(input);
    const actions: StrapiApplyAction[] = [];
    const references = new Map<string, string | number>();
    const mediaBySource = new Map(
      input.media.assets.map((asset) => [asset.source, asset]),
    );

    for (const operation of input.plan.operations) {
      if (operation.kind === 'media') {
        const asset = mediaBySource.get(operation.key);
        if (!asset) {
          throw new StrapiApplyError({
            category: 'validation',
            code: 'INPUT_INVALID',
            message: 'Migration media resolution is incomplete.',
          });
        }
        const existing = await findMedia(deterministicMediaName(asset));
        const action: ApplyAction = existing ? 'reuse' : 'upload';
        actions.push({ kind: operation.kind, key: operation.key, action });
        if (existing) {
          references.set(`media:${operation.key}`, existing.id);
        } else if (!input.dryRun) {
          const uploaded = await uploadMedia(operation, asset);
          references.set(`media:${operation.key}`, uploaded.id);
        }
        continue;
      }

      const collection = collectionSpecs[operation.kind];
      if (collection) {
        const existing = await findCollection(operation, collection);
        const action: ApplyAction = existing ? 'update' : 'create';
        actions.push({ kind: operation.kind, key: operation.key, action });
        if (!input.dryRun) {
          const endpoint = existing
            ? `${collection.endpoint}/${existing.documentId}`
            : collection.endpoint;
          const { body } = await request(
            `${endpoint}${collection.draft ? '?status=draft' : ''}`,
            {
              method: existing ? 'PUT' : 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                data: transformPayload(operation, references),
              }),
            },
            existing ? [200] : [200, 201],
          );
          const documentId = record(record(body).data).documentId;
          if (typeof documentId !== 'string') {
            throw new StrapiApplyError({
              category: 'dependency',
              code: 'DEPENDENCY_UNAVAILABLE',
              message: 'Strapi returned an invalid migration response.',
            });
          }
          references.set(`${operation.kind}:${operation.key}`, documentId);
        } else if (existing) {
          references.set(
            `${operation.kind}:${operation.key}`,
            existing.documentId,
          );
        }
        continue;
      }

      const single = singleSpecs[operation.kind];
      if (!single) {
        throw new StrapiApplyError({
          category: 'validation',
          code: 'INPUT_INVALID',
          message: 'Migration operation kind is unsupported.',
        });
      }
      const existing = await findSingle(single);
      actions.push({
        kind: operation.kind,
        key: operation.key,
        action: existing ? 'update' : 'create',
      });
      if (!input.dryRun) {
        await request(
          `${single}?status=draft`,
          {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: transformPayload(operation, references),
            }),
          },
          [200, 201],
        );
      }
    }

    return {
      schemaVersion: 1,
      mode: input.dryRun ? 'dry-run' : 'apply',
      planRevision: input.plan.planRevision,
      actions,
      totals: countActions(actions),
    };
  }

  return { apply };
}
