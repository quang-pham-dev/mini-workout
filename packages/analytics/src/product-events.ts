import type { AnalyticsProperties } from './index';

const identifierPattern =
  /^(?!https?:)(?!.*[?#@])[a-zA-Z0-9/][a-zA-Z0-9._:/-]{0,79}$/;

const eventSchemas = {
  landing_page_view: {
    required: ['route_template'],
    optional: [
      'content_id',
      'campaign_id',
      'referrer_class',
      'utm_source',
      'utm_medium',
      'utm_campaign',
    ],
  },
  cta_clicked: {
    required: [
      'route_template',
      'cta_id',
      'destination_app',
      'action',
      'placement',
    ],
    optional: [
      'campaign_id',
      'referrer_class',
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'experiment_id',
      'variant_id',
    ],
  },
  campaign_view: {
    required: ['route_template', 'campaign_id'],
    optional: ['referrer_class', 'utm_source', 'utm_medium', 'utm_campaign'],
  },
  experiment_exposure: {
    required: ['route_template', 'experiment_id', 'variant_id'],
    optional: ['campaign_id'],
  },
  content_engaged: {
    required: ['route_template', 'content_id', 'content_type', 'engagement'],
    optional: ['campaign_id', 'experiment_id', 'variant_id'],
  },
} as const;

const propertyEnums: Readonly<Record<string, ReadonlySet<string>>> = {
  destination_app: new Set(['member', 'admin', 'studio']),
  action: new Set(['login', 'register', 'open']),
  referrer_class: new Set([
    'direct',
    'internal',
    'search',
    'social',
    'referral',
    'unknown',
  ]),
  content_type: new Set(['article', 'category', 'campaign', 'pricing']),
  engagement: new Set(['started', 'completed']),
};

export type ProductEventName = keyof typeof eventSchemas;
export type SanitizedProductEvent = Readonly<Record<string, string>>;
type AcquisitionProperties = Readonly<{
  referrer_class?:
    'direct' | 'internal' | 'search' | 'social' | 'referral' | 'unknown';
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}>;

export type ProductEventProperties = Readonly<{
  landing_page_view: AcquisitionProperties & {
    route_template: string;
    content_id?: string;
    campaign_id?: string;
  };
  cta_clicked: AcquisitionProperties & {
    route_template: string;
    cta_id: string;
    destination_app: 'member' | 'admin' | 'studio';
    action: 'login' | 'register' | 'open';
    placement: string;
    campaign_id?: string;
    experiment_id?: string;
    variant_id?: string;
  };
  campaign_view: AcquisitionProperties & {
    route_template: string;
    campaign_id: string;
  };
  experiment_exposure: {
    route_template: string;
    experiment_id: string;
    variant_id: string;
    campaign_id?: string;
  };
  content_engaged: {
    route_template: string;
    content_id: string;
    content_type: 'article' | 'category' | 'campaign' | 'pricing';
    engagement: 'started' | 'completed';
    campaign_id?: string;
    experiment_id?: string;
    variant_id?: string;
  };
}>;

export function isProductEventName(value: string): value is ProductEventName {
  return Object.hasOwn(eventSchemas, value);
}

function sanitizeValue(property: string, value: unknown): string | undefined {
  if (typeof value !== 'string' || !identifierPattern.test(value))
    return undefined;
  const allowedValues = propertyEnums[property];
  if (allowedValues && !allowedValues.has(value)) return undefined;
  return value;
}

export function sanitizeProductEvent(
  event: string,
  properties: AnalyticsProperties,
): SanitizedProductEvent | undefined {
  if (!isProductEventName(event)) return undefined;

  const schema = eventSchemas[event];
  const allowed = new Set<string>([...schema.required, ...schema.optional]);
  const sanitized: Record<string, string> = {};

  for (const [property, value] of Object.entries(properties)) {
    if (!allowed.has(property)) continue;
    const safeValue = sanitizeValue(property, value);
    if (safeValue !== undefined) sanitized[property] = safeValue;
  }

  if (schema.required.some((property) => !sanitized[property]))
    return undefined;
  return sanitized;
}

export function captureProductEvent<Event extends ProductEventName>(
  client: Readonly<{
    capture: (event: string, properties?: AnalyticsProperties) => void;
  }>,
  event: Event,
  properties: ProductEventProperties[Event],
): boolean {
  const sanitized = sanitizeProductEvent(
    event,
    properties as AnalyticsProperties,
  );
  if (!sanitized) return false;
  try {
    client.capture(event, sanitized);
    return true;
  } catch {
    return false;
  }
}
