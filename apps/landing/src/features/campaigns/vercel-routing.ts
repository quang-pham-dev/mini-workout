import { isSafeInternalPath } from '../../content/validation-primitives.js';
import {
  type LandingSecurityPolicyInput,
  createLandingSecurityHeaders,
} from '../../rollout/security-headers.js';
import type { CampaignDeliveryPlan } from './delivery.js';

export interface CampaignRoutingManifest {
  version: 1;
  redirects: CampaignDeliveryPlan['redirects'];
  gone: CampaignDeliveryPlan['gone'];
}

export interface VercelRoute {
  src?: string;
  headers?: Readonly<Record<string, string>>;
  status?: number;
  continue?: boolean;
  handle?: 'filesystem';
}

export interface VercelBuildOutputConfig {
  version: 3;
  routes: readonly VercelRoute[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function assertInternalPath(
  value: unknown,
  label: string,
): asserts value is string {
  if (typeof value !== 'string' || !isSafeInternalPath(value)) {
    throw new Error(`${label} must be an internal path.`);
  }
}

function assertCampaignPath(value: unknown): asserts value is string {
  assertInternalPath(value, 'Campaign route');
  if (!/^\/campaigns\/[a-z0-9]+(?:-[a-z0-9]+)*\/$/.test(value)) {
    throw new Error('Campaign route must use the canonical campaign path.');
  }
}

function escapeRoutePath(path: string): string {
  return path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\/$/, '/?');
}

export function parseCampaignRoutingManifest(
  value: unknown,
): CampaignRoutingManifest {
  if (!isRecord(value) || value.version !== 1) {
    throw new Error('Unsupported Campaign routing manifest version.');
  }
  if (!Array.isArray(value.redirects) || !Array.isArray(value.gone)) {
    throw new Error('Campaign routing manifest must contain route arrays.');
  }

  const seen = new Set<string>();
  const redirects = value.redirects.map((candidate) => {
    if (!isRecord(candidate) || candidate.statusCode !== 308) {
      throw new Error('Campaign redirect must use status 308.');
    }
    assertCampaignPath(candidate.source);
    assertInternalPath(candidate.destination, 'Campaign redirect destination');
    if (seen.has(candidate.source)) {
      throw new Error('Campaign routing manifest contains duplicate paths.');
    }
    seen.add(candidate.source);
    return {
      source: candidate.source,
      destination: candidate.destination,
      statusCode: 308 as const,
    };
  });

  const gone = value.gone.map((candidate) => {
    if (!isRecord(candidate) || candidate.statusCode !== 410) {
      throw new Error('Expired Campaign route must use status 410.');
    }
    assertCampaignPath(candidate.path);
    if (seen.has(candidate.path)) {
      throw new Error('Campaign routing manifest contains duplicate paths.');
    }
    seen.add(candidate.path);
    return { path: candidate.path, statusCode: 410 as const };
  });

  return { version: 1, redirects, gone };
}

export function createCampaignRoutingManifest(
  plan: CampaignDeliveryPlan,
): CampaignRoutingManifest {
  return parseCampaignRoutingManifest({
    version: 1,
    redirects: plan.redirects,
    gone: plan.gone,
  });
}

export function createVercelCampaignRoutes(
  value: unknown,
): readonly VercelRoute[] {
  const manifest = parseCampaignRoutingManifest(value);
  return [
    ...manifest.redirects.map(({ source, destination, statusCode }) => ({
      src: `^${escapeRoutePath(source)}$`,
      headers: { Location: destination },
      status: statusCode,
    })),
    ...manifest.gone.map(({ path, statusCode }) => ({
      src: `^${escapeRoutePath(path)}$`,
      status: statusCode,
    })),
  ];
}

export function createVercelBuildOutputConfig(
  value: unknown,
  securityPolicy: LandingSecurityPolicyInput = {
    mode: 'public',
    analytics: { enabled: false, host: 'https://us.i.posthog.com/' },
  },
): VercelBuildOutputConfig {
  return {
    version: 3,
    routes: [
      {
        src: '^/.*$',
        headers: createLandingSecurityHeaders(securityPolicy),
        continue: true,
      },
      ...createVercelCampaignRoutes(value),
      { src: '^/\\.well-known(?:/.*)?$' },
      {
        src: '^/((?:[^/]+/)*[^/.]+)$',
        headers: { Location: '/$1/' },
        status: 308,
      },
      {
        src: '^/((?:[^/]+/)*[^/]+\\.\\w+)/$',
        headers: { Location: '/$1' },
        status: 308,
      },
      {
        src: '^/_astro(?:/(.*))$',
        headers: { 'cache-control': 'public, max-age=31536000, immutable' },
        continue: true,
      },
      { handle: 'filesystem' },
    ],
  };
}
