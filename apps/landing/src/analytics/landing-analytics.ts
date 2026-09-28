import type { AnalyticsProperties } from '@mini-workout/analytics';
import { captureProductEvent } from '@mini-workout/analytics/product-events';

type CaptureClient = Readonly<{
  capture: (event: string, properties?: AnalyticsProperties) => void;
}>;
type ClickTarget = Readonly<{ closest: (selector: string) => unknown }>;
type CrossAppLink = Readonly<{
  dataset: Readonly<Record<string, string | undefined>>;
}>;

export type LandingAnalyticsDependencies = Readonly<{
  enabled: boolean;
  hasConsent: () => boolean;
  loadClient: () => Promise<CaptureClient>;
  location: URL;
  referrer: string;
  addEventListener: (name: 'click', listener: (event: Event) => void) => void;
}>;

const searchHosts = ['google.', 'bing.com', 'duckduckgo.com', 'search.yahoo.'];
const socialHosts = [
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  't.co',
  'x.com',
  'youtube.com',
];

export function routeTemplateForPath(pathname: string): string | undefined {
  const normalized = pathname.endsWith('/') ? pathname : `${pathname}/`;
  if (normalized === '/') return '/';
  if (normalized === '/pricing/') return '/pricing/';
  if (/^\/articles\/[^/]+\/$/.test(normalized)) return '/articles/:slug/';
  if (/^\/movement\/[^/]+\/$/.test(normalized)) return '/movement/:slug/';
  if (/^\/campaigns\/[^/]+\/$/.test(normalized)) return '/campaigns/:slug/';
  return undefined;
}

export function classifyReferrer(
  referrer: string,
  currentHostname: string,
): 'direct' | 'internal' | 'search' | 'social' | 'referral' | 'unknown' {
  if (!referrer) return 'direct';
  try {
    const hostname = new URL(referrer).hostname.toLowerCase();
    if (
      hostname === currentHostname ||
      hostname.endsWith(`.${currentHostname}`)
    )
      return 'internal';
    if (searchHosts.some((host) => hostname.includes(host))) return 'search';
    if (
      socialHosts.some(
        (host) => hostname === host || hostname.endsWith(`.${host}`),
      )
    )
      return 'social';
    return 'referral';
  } catch {
    return 'unknown';
  }
}

function normalizeCampaignValue(value: string | null): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (trimmed.length > 80 || !/^[a-zA-Z0-9._ -]+$/.test(trimmed)) {
    return undefined;
  }
  const normalized = trimmed.toLowerCase().replace(/\s+/g, '-');
  return normalized || undefined;
}

function acquisitionProperties(location: URL, referrer: string) {
  const values: {
    referrer_class: ReturnType<typeof classifyReferrer>;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
  } = {
    referrer_class: classifyReferrer(referrer, location.hostname),
  };
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign'] as const) {
    const value = normalizeCampaignValue(location.searchParams.get(key));
    if (value) values[key] = value;
  }
  return values;
}

function hasFunction(
  value: unknown,
  property: 'closest',
): value is ClickTarget {
  return Boolean(
    value &&
    typeof value === 'object' &&
    property in value &&
    typeof (value as ClickTarget)[property] === 'function',
  );
}

function isCrossAppLink(value: unknown): value is CrossAppLink {
  return Boolean(value && typeof value === 'object' && 'dataset' in value);
}

function isDestinationApp(
  value: string | undefined,
): value is 'member' | 'admin' | 'studio' {
  return value === 'member' || value === 'admin' || value === 'studio';
}

function isNavigationAction(
  value: string | undefined,
): value is 'login' | 'register' | 'open' {
  return value === 'login' || value === 'register' || value === 'open';
}

function experimentProperties(data: CrossAppLink['dataset']): Readonly<{
  experiment_id?: string;
  variant_id?: string;
}> {
  const pattern = /^[a-z0-9][a-z0-9.-]{0,79}$/;
  if (
    !data.analyticsExperimentId ||
    !data.analyticsVariantId ||
    !pattern.test(data.analyticsExperimentId) ||
    !pattern.test(data.analyticsVariantId)
  ) {
    return {};
  }
  return {
    experiment_id: data.analyticsExperimentId,
    variant_id: data.analyticsVariantId,
  };
}

export async function initializeLandingAnalytics(
  dependencies: LandingAnalyticsDependencies,
): Promise<boolean> {
  const routeTemplate = routeTemplateForPath(dependencies.location.pathname);
  if (!dependencies.enabled || !dependencies.hasConsent() || !routeTemplate)
    return false;

  try {
    const client = await dependencies.loadClient();
    const acquisition = acquisitionProperties(
      dependencies.location,
      dependencies.referrer,
    );
    captureProductEvent(client, 'landing_page_view', {
      route_template: routeTemplate,
      ...acquisition,
    });

    dependencies.addEventListener('click', (event) => {
      if (!hasFunction(event.target, 'closest')) return;
      const candidate = event.target.closest(
        '[data-cross-app-navigation="true"]',
      );
      if (!isCrossAppLink(candidate)) return;
      const data = candidate.dataset;
      if (
        !data.analyticsCtaId ||
        !isDestinationApp(data.destinationApp) ||
        !isNavigationAction(data.navigationAction) ||
        !data.navigationPlacement
      ) {
        return;
      }
      captureProductEvent(client, 'cta_clicked', {
        route_template: routeTemplate,
        cta_id: data.analyticsCtaId,
        destination_app: data.destinationApp,
        action: data.navigationAction,
        placement: data.navigationPlacement,
        ...experimentProperties(data),
        ...acquisition,
      });
    });
    return true;
  } catch {
    return false;
  }
}
