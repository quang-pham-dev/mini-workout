export type LandingServiceOperation =
  'preview.enable' | 'publish.webhook' | 'publish.ready';

export type LandingServiceOutcome =
  | 'accepted'
  | 'auth_rejected'
  | 'configuration_failed'
  | 'dependency_failed'
  | 'duplicate'
  | 'failed'
  | 'input_rejected'
  | 'internal_failed'
  | 'ready'
  | 'success';

export interface LandingServiceObservation {
  at: string;
  operation: LandingServiceOperation;
  outcome: LandingServiceOutcome;
  durationMs?: number;
}

export interface LandingServiceIndicator {
  key:
    | 'preview_availability'
    | 'publish_webhook_availability'
    | 'publish_to_ready';
  objective: number;
  sampleCount: number;
  status: 'breach' | 'insufficient_data' | 'pass';
  value?: number;
}

export interface LandingServiceIncident {
  code:
    | 'landing_configuration_invalid'
    | 'landing_preview_failures'
    | 'landing_publish_to_ready_slow'
    | 'landing_publish_webhook_failures';
  owner: 'landing-engineering';
  runbook: 'docs/observability/LANDING_SERVICE_LEVELS.md';
  severity: 'critical' | 'warning';
}

export interface LandingServiceLevelReport {
  indicators: readonly LandingServiceIndicator[];
  incidents: readonly LandingServiceIncident[];
}

const evaluationPeriodMs = 28 * 24 * 60 * 60 * 1_000;
const alertWindowMs = 5 * 60 * 1_000;
const publishReadyObjectiveMs = 5 * 60 * 1_000;
const minimumSamples = 20;
const minimumFailuresPerWindow = 5;
const runbook = 'docs/observability/LANDING_SERVICE_LEVELS.md' as const;

const allowedOutcomes: Readonly<
  Record<LandingServiceOperation, ReadonlySet<LandingServiceOutcome>>
> = {
  'preview.enable': new Set([
    'success',
    'auth_rejected',
    'configuration_failed',
    'dependency_failed',
    'internal_failed',
  ]),
  'publish.webhook': new Set([
    'accepted',
    'duplicate',
    'input_rejected',
    'auth_rejected',
    'configuration_failed',
    'dependency_failed',
    'internal_failed',
  ]),
  'publish.ready': new Set(['ready', 'failed']),
};

type TimedObservation = Readonly<{
  observation: LandingServiceObservation;
  timestamp: number;
}>;

function invalidObservation(): never {
  throw new Error('Landing service observation is invalid.');
}

function validateObservations(
  observations: readonly LandingServiceObservation[],
  now: number,
): readonly TimedObservation[] {
  return observations.map((observation) => {
    const timestamp = Date.parse(observation.at);
    if (
      !Number.isFinite(timestamp) ||
      timestamp > now ||
      !allowedOutcomes[observation.operation]?.has(observation.outcome) ||
      (observation.durationMs !== undefined &&
        (!Number.isFinite(observation.durationMs) ||
          observation.durationMs < 0)) ||
      (observation.operation === 'publish.ready' &&
        observation.outcome === 'ready' &&
        observation.durationMs === undefined)
    ) {
      invalidObservation();
    }
    return { observation, timestamp };
  });
}

function indicator(
  key: LandingServiceIndicator['key'],
  objective: number,
  eligible: readonly TimedObservation[],
  isSuccessful: (value: LandingServiceObservation) => boolean,
): LandingServiceIndicator {
  if (eligible.length < minimumSamples) {
    return {
      key,
      objective,
      sampleCount: eligible.length,
      status: 'insufficient_data',
    };
  }
  const value =
    eligible.filter(({ observation }) => isSuccessful(observation)).length /
    eligible.length;
  return {
    key,
    objective,
    sampleCount: eligible.length,
    status: value >= objective ? 'pass' : 'breach',
    value,
  };
}

function inWindow(
  value: TimedObservation,
  start: number,
  end: number,
  includeEnd: boolean,
): boolean {
  return (
    value.timestamp >= start &&
    (includeEnd ? value.timestamp <= end : value.timestamp < end)
  );
}

function actionableFailure(value: LandingServiceObservation): boolean {
  return (
    value.outcome === 'dependency_failed' || value.outcome === 'internal_failed'
  );
}

function hasConsecutiveFailureWindows(
  observations: readonly TimedObservation[],
  operation: LandingServiceOperation,
  now: number,
): boolean {
  const failures = observations.filter(
    ({ observation }) =>
      observation.operation === operation && actionableFailure(observation),
  );
  const currentCount = failures.filter((value) =>
    inWindow(value, now - alertWindowMs, now, true),
  ).length;
  const previousCount = failures.filter((value) =>
    inWindow(value, now - 2 * alertWindowMs, now - alertWindowMs, false),
  ).length;
  return (
    currentCount >= minimumFailuresPerWindow &&
    previousCount >= minimumFailuresPerWindow
  );
}

function breachedPublishReady(value: TimedObservation): boolean {
  const { observation } = value;
  return (
    observation.operation === 'publish.ready' &&
    (observation.outcome === 'failed' ||
      (observation.durationMs ?? Number.POSITIVE_INFINITY) >
        publishReadyObjectiveMs)
  );
}

export function evaluateLandingServiceLevels(
  input: Readonly<{
    now: Date;
    observations: readonly LandingServiceObservation[];
  }>,
): LandingServiceLevelReport {
  const now = input.now.getTime();
  if (!Number.isFinite(now)) invalidObservation();
  const validated = validateObservations(input.observations, now);
  const period = validated.filter(
    ({ timestamp }) => timestamp >= now - evaluationPeriodMs,
  );
  const previewEligible = period.filter(
    ({ observation }) =>
      observation.operation === 'preview.enable' &&
      observation.outcome !== 'auth_rejected',
  );
  const webhookEligible = period.filter(
    ({ observation }) =>
      observation.operation === 'publish.webhook' &&
      observation.outcome !== 'auth_rejected' &&
      observation.outcome !== 'input_rejected' &&
      observation.outcome !== 'duplicate',
  );
  const publishReadyEligible = period.filter(
    ({ observation }) => observation.operation === 'publish.ready',
  );

  const indicators: LandingServiceIndicator[] = [
    indicator(
      'preview_availability',
      0.99,
      previewEligible,
      (value) => value.outcome === 'success',
    ),
    indicator(
      'publish_webhook_availability',
      0.99,
      webhookEligible,
      (value) => value.outcome === 'accepted',
    ),
    indicator(
      'publish_to_ready',
      0.95,
      publishReadyEligible,
      (value) =>
        value.outcome === 'ready' &&
        (value.durationMs ?? Number.POSITIVE_INFINITY) <=
          publishReadyObjectiveMs,
    ),
  ];

  const incidents: LandingServiceIncident[] = [];
  const currentWindow = validated.filter((value) =>
    inWindow(value, now - alertWindowMs, now, true),
  );
  if (
    currentWindow.some(
      ({ observation }) => observation.outcome === 'configuration_failed',
    )
  ) {
    incidents.push({
      code: 'landing_configuration_invalid',
      owner: 'landing-engineering',
      runbook,
      severity: 'critical',
    });
  }
  if (hasConsecutiveFailureWindows(validated, 'preview.enable', now)) {
    incidents.push({
      code: 'landing_preview_failures',
      owner: 'landing-engineering',
      runbook,
      severity: 'critical',
    });
  }
  if (hasConsecutiveFailureWindows(validated, 'publish.webhook', now)) {
    incidents.push({
      code: 'landing_publish_webhook_failures',
      owner: 'landing-engineering',
      runbook,
      severity: 'critical',
    });
  }
  const latestPublishReady = publishReadyEligible
    .toSorted((left, right) => right.timestamp - left.timestamp)
    .slice(0, 2);
  if (
    latestPublishReady.length === 2 &&
    latestPublishReady.every(breachedPublishReady)
  ) {
    incidents.push({
      code: 'landing_publish_to_ready_slow',
      owner: 'landing-engineering',
      runbook,
      severity: 'warning',
    });
  }

  return {
    indicators,
    incidents: incidents.sort((left, right) =>
      left.code.localeCompare(right.code),
    ),
  };
}
