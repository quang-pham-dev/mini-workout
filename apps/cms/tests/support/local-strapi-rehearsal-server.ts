import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';

interface LocalRehearsalOptions {
  readonly token: string;
}

interface StoredDocument {
  readonly documentId: string;
  readonly data: Record<string, unknown>;
}

interface RehearsalState {
  readonly media: Map<string, { id: number; name: string }>;
  readonly collections: Map<string, Map<string, StoredDocument>>;
  readonly singles: Map<string, StoredDocument>;
  unauthorizedRequests: number;
  publishedWrites: number;
  nextId: number;
}

const collectionStableFields: Record<string, string> = {
  authors: 'name',
  categories: 'slug',
  articles: 'slug',
  campaigns: 'campaignId',
  'marketing-pages': 'slug',
};

const draftEndpoints = new Set([
  'categories',
  'articles',
  'campaigns',
  'marketing-pages',
  'pricing-page',
  'site-setting',
  'primary-navigation',
]);

async function body(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

function send(response: ServerResponse, status: number, value?: unknown): void {
  response.statusCode = status;
  if (value === undefined) {
    response.end();
    return;
  }
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(value));
}

function nextDocument(state: RehearsalState, data: Record<string, unknown>) {
  const document = {
    documentId: `local-document-${state.nextId++}`,
    data,
  };
  return document;
}

function responseDocument(document: StoredDocument) {
  return { documentId: document.documentId, ...document.data };
}

function stableValue(url: URL, field: string): string {
  return url.searchParams.get(`filters[${field}][$eq]`) ?? '';
}

function parseJsonBody(value: Buffer): Record<string, unknown> {
  const parsed = JSON.parse(value.toString('utf8')) as unknown;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error('Invalid local rehearsal request');
  }
  const data = (parsed as { data?: unknown }).data;
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    throw new Error('Invalid local rehearsal request');
  }
  return data as Record<string, unknown>;
}

async function handleUpload(
  request: IncomingMessage,
  response: ServerResponse,
  state: RehearsalState,
  url: URL,
): Promise<boolean> {
  if (url.pathname === '/api/upload/files/page' && request.method === 'GET') {
    const name = stableValue(url, 'name');
    const media = state.media.get(name);
    send(response, 200, { data: media ? [media] : [], meta: {} });
    return true;
  }
  if (url.pathname === '/api/upload' && request.method === 'POST') {
    const payload = (await body(request)).toString('utf8');
    const name = payload.match(
      /migration-[a-f0-9]{64}\.(?:avif|jpe?g|png|webp)/,
    )?.[0];
    if (!name) {
      send(response, 400, { error: { name: 'ValidationError' } });
      return true;
    }
    const existing = state.media.get(name);
    const media =
      existing ??
      ({ id: state.nextId++, name } satisfies { id: number; name: string });
    state.media.set(name, media);
    send(response, 201, [media]);
    return true;
  }
  return false;
}

async function handleCollection(
  request: IncomingMessage,
  response: ServerResponse,
  state: RehearsalState,
  url: URL,
): Promise<boolean> {
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments[0] !== 'api' || !collectionStableFields[segments[1] ?? '']) {
    return false;
  }
  const endpoint = segments[1]!;
  const documentId = segments[2];
  const field = collectionStableFields[endpoint]!;
  const documents = state.collections.get(endpoint) ?? new Map();
  state.collections.set(endpoint, documents);

  if (request.method === 'GET' && !documentId) {
    const key = stableValue(url, field);
    const document = documents.get(key);
    send(response, 200, { data: document ? [responseDocument(document)] : [] });
    return true;
  }
  if (request.method === 'POST' && !documentId) {
    if (
      draftEndpoints.has(endpoint) &&
      url.searchParams.get('status') !== 'draft'
    ) {
      state.publishedWrites += 1;
    }
    const data = parseJsonBody(await body(request));
    const key = String(data[field] ?? '');
    if (!key || documents.has(key)) {
      send(response, 409, { error: { name: 'ConflictError' } });
      return true;
    }
    const document = nextDocument(state, data);
    documents.set(key, document);
    send(response, 201, { data: responseDocument(document) });
    return true;
  }
  if (request.method === 'PUT' && documentId) {
    if (
      draftEndpoints.has(endpoint) &&
      url.searchParams.get('status') !== 'draft'
    ) {
      state.publishedWrites += 1;
    }
    const entry = [...documents.entries()].find(
      ([, document]) => document.documentId === documentId,
    );
    if (!entry) {
      send(response, 404, { error: { name: 'NotFoundError' } });
      return true;
    }
    const data = parseJsonBody(await body(request));
    const updated = { documentId, data };
    documents.delete(entry[0]);
    documents.set(String(data[field] ?? entry[0]), updated);
    send(response, 200, { data: responseDocument(updated) });
    return true;
  }
  return false;
}

async function handleSingle(
  request: IncomingMessage,
  response: ServerResponse,
  state: RehearsalState,
  url: URL,
): Promise<boolean> {
  const endpoint = url.pathname.replace('/api/', '');
  if (!draftEndpoints.has(endpoint) || endpoint.includes('/')) return false;
  if (request.method === 'GET') {
    const document = state.singles.get(endpoint);
    send(
      response,
      document ? 200 : 404,
      document
        ? { data: responseDocument(document) }
        : { data: null, error: { name: 'NotFoundError' } },
    );
    return true;
  }
  if (request.method === 'PUT') {
    if (url.searchParams.get('status') !== 'draft') state.publishedWrites += 1;
    const data = parseJsonBody(await body(request));
    const existing = state.singles.get(endpoint);
    const document = existing
      ? { documentId: existing.documentId, data }
      : nextDocument(state, data);
    state.singles.set(endpoint, document);
    send(response, existing ? 200 : 201, { data: responseDocument(document) });
    return true;
  }
  return false;
}

export async function startLocalStrapiRehearsalServer(
  options: LocalRehearsalOptions,
) {
  const state: RehearsalState = {
    media: new Map(),
    collections: new Map(),
    singles: new Map(),
    unauthorizedRequests: 0,
    publishedWrites: 0,
    nextId: 1,
  };
  const server = createServer(async (request, response) => {
    if (request.headers.authorization !== `Bearer ${options.token}`) {
      state.unauthorizedRequests += 1;
      send(response, 401, { error: { name: 'UnauthorizedError' } });
      return;
    }
    const url = new URL(request.url ?? '/', 'http://127.0.0.1');
    try {
      if (await handleUpload(request, response, state, url)) return;
      if (await handleCollection(request, response, state, url)) return;
      if (await handleSingle(request, response, state, url)) return;
      send(response, 404, { error: { name: 'NotFoundError' } });
    } catch {
      send(response, 400, { error: { name: 'ValidationError' } });
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Local rehearsal server did not bind to a TCP port.');
  }

  return {
    apiUrl: `http://127.0.0.1:${address.port}`,
    snapshot: () => ({
      counts: {
        media: state.media.size,
        authors: state.collections.get('authors')?.size ?? 0,
        categories: state.collections.get('categories')?.size ?? 0,
        pricingPage: state.singles.has('pricing-page') ? 1 : 0,
      },
      unauthorizedRequests: state.unauthorizedRequests,
      publishedWrites: state.publishedWrites,
    }),
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}
