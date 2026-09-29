import {
  type LandingExperiment,
  validateExperimentRegistry,
} from './experiment-registry';

type MetricDirection = 'increase' | 'decrease' | 'no-decrease' | 'no-increase';

type ExperimentMetricBase = Readonly<{
  id: string;
  role: 'primary' | 'guardrail';
  direction: MetricDirection;
  statistic: 'unique-subject-conversion-rate';
  attributionWindowHours: number;
}>;

export type LandingExperimentMetric = ExperimentMetricBase &
  (
    | Readonly<{
        event: 'cta_clicked';
        outcome: Readonly<{
          action: 'login' | 'register' | 'open';
          destinationApp: 'member' | 'admin' | 'studio';
        }>;
      }>
    | Readonly<{
        event: 'content_engaged';
        outcome: Readonly<{
          engagement: 'started' | 'completed';
        }>;
      }>
  );

export type LandingExperimentBrief = Readonly<{
  schemaVersion: 1;
  status: 'draft' | 'approved';
  experimentId: string;
  experimentVersion: number;
  mode: 'aa' | 'ab';
  owner: string;
  hypothesis: string;
  primaryMetric: LandingExperimentMetric;
  guardrailMetrics: readonly LandingExperimentMetric[];
  minimumSamplePerVariant: number;
  minimumRuntimeDays: number;
  maximumRuntimeDays: number;
  stoppingRule: string;
  approvals: Readonly<{
    product: boolean;
    data: boolean;
    legal: boolean;
  }>;
  reporting: Readonly<{
    status: 'draft' | 'verified';
    reportKey?: string;
    exposureEvent: 'experiment_exposure';
    joinKeys: readonly [
      'anonymous_subject',
      'experiment_version',
      'variant_id',
    ];
    assignmentUnit: 'consented-anonymous-subject';
    analysisUnit: 'subject';
    refreshCadence: 'daily';
  }>;
}>;

export type ExperimentActivationIssue = Readonly<{
  severity: 'error';
  code:
    | 'experiment_brief_missing'
    | 'experiment_brief_not_approved'
    | 'experiment_brief_registry_mismatch'
    | 'experiment_definition_missing'
    | 'experiment_report_not_verified';
  path: string;
}>;

const identifierPattern = /^[a-z0-9][a-z0-9-]{0,63}$/;
const expectedJoinKeys = [
  'anonymous_subject',
  'experiment_version',
  'variant_id',
] as const;

function isNonEmptyText(value: string): boolean {
  return value.trim().length > 0 && value.length <= 240;
}

function hasExactKeys(
  value: Readonly<Record<string, unknown>>,
  expected: readonly string[],
): boolean {
  const keys = Object.keys(value).sort();
  return (
    keys.length === expected.length &&
    [...expected].sort().every((key, index) => key === keys[index])
  );
}

function isValidMetric(metric: LandingExperimentMetric): boolean {
  if (
    !identifierPattern.test(metric.id) ||
    !['primary', 'guardrail'].includes(metric.role) ||
    !['increase', 'decrease', 'no-decrease', 'no-increase'].includes(
      metric.direction,
    ) ||
    metric.statistic !== 'unique-subject-conversion-rate' ||
    !Number.isSafeInteger(metric.attributionWindowHours) ||
    metric.attributionWindowHours < 1 ||
    metric.attributionWindowHours > 168
  ) {
    return false;
  }

  if (metric.event === 'cta_clicked') {
    return (
      hasExactKeys(metric.outcome, ['action', 'destinationApp']) &&
      ['login', 'register', 'open'].includes(metric.outcome.action) &&
      ['member', 'admin', 'studio'].includes(metric.outcome.destinationApp)
    );
  }
  if (metric.event === 'content_engaged') {
    return (
      hasExactKeys(metric.outcome, ['engagement']) &&
      ['started', 'completed'].includes(metric.outcome.engagement)
    );
  }
  return false;
}

function allApprovalsGranted(brief: LandingExperimentBrief): boolean {
  return Object.values(brief.approvals).every(Boolean);
}

function isValidReportingContract(brief: LandingExperimentBrief): boolean {
  const { reporting } = brief;
  return Boolean(
    ['draft', 'verified'].includes(reporting.status) &&
    (reporting.status !== 'verified' ||
      (reporting.reportKey && identifierPattern.test(reporting.reportKey))) &&
    reporting.exposureEvent === 'experiment_exposure' &&
    reporting.joinKeys.length === expectedJoinKeys.length &&
    reporting.joinKeys.every((key, index) => key === expectedJoinKeys[index]) &&
    reporting.assignmentUnit === 'consented-anonymous-subject' &&
    reporting.analysisUnit === 'subject' &&
    reporting.refreshCadence === 'daily',
  );
}

function isValidBrief(brief: LandingExperimentBrief): boolean {
  const metricIds = new Set([
    brief.primaryMetric.id,
    ...brief.guardrailMetrics.map(({ id }) => id),
  ]);

  return Boolean(
    brief.schemaVersion === 1 &&
    ['draft', 'approved'].includes(brief.status) &&
    identifierPattern.test(brief.experimentId) &&
    Number.isSafeInteger(brief.experimentVersion) &&
    brief.experimentVersion > 0 &&
    ['aa', 'ab'].includes(brief.mode) &&
    identifierPattern.test(brief.owner) &&
    isNonEmptyText(brief.hypothesis) &&
    brief.primaryMetric.role === 'primary' &&
    isValidMetric(brief.primaryMetric) &&
    brief.guardrailMetrics.length > 0 &&
    brief.guardrailMetrics.every(
      (metric) => metric.role === 'guardrail' && isValidMetric(metric),
    ) &&
    metricIds.size === brief.guardrailMetrics.length + 1 &&
    Number.isSafeInteger(brief.minimumSamplePerVariant) &&
    brief.minimumSamplePerVariant >= 100 &&
    brief.minimumSamplePerVariant <= 1_000_000 &&
    Number.isSafeInteger(brief.minimumRuntimeDays) &&
    brief.minimumRuntimeDays >= 1 &&
    Number.isSafeInteger(brief.maximumRuntimeDays) &&
    brief.maximumRuntimeDays >= brief.minimumRuntimeDays &&
    brief.maximumRuntimeDays <= 90 &&
    isNonEmptyText(brief.stoppingRule) &&
    (brief.status !== 'approved' || allApprovalsGranted(brief)) &&
    isValidReportingContract(brief),
  );
}

function briefIdentity(value: {
  experimentId: string;
  experimentVersion: number;
}): string {
  return `${value.experimentId}.v${value.experimentVersion}`;
}

function experimentIdentity(value: { id: string; version: number }): string {
  return `${value.id}.v${value.version}`;
}

export function validateExperimentBriefRegistry(
  briefs: readonly LandingExperimentBrief[],
): readonly LandingExperimentBrief[] {
  const identities = new Set(briefs.map(briefIdentity));
  if (
    identities.size !== briefs.length ||
    briefs.some((brief) => !isValidBrief(brief))
  ) {
    throw new Error('EXPERIMENT_BRIEF_REGISTRY_INVALID');
  }
  return briefs;
}

function registryMatchesBrief(
  experiment: LandingExperiment,
  brief: LandingExperimentBrief,
): boolean {
  return Boolean(
    experiment.mode === brief.mode &&
    experiment.owner === brief.owner &&
    experiment.hypothesis === brief.hypothesis &&
    experiment.primaryMetric === brief.primaryMetric.id &&
    experiment.guardrailMetrics.length === brief.guardrailMetrics.length &&
    experiment.guardrailMetrics.every(
      (metric, index) => metric === brief.guardrailMetrics[index]?.id,
    ) &&
    experiment.stoppingRule === brief.stoppingRule,
  );
}

export function assessExperimentActivationReadiness(
  input: Readonly<{
    experiments: readonly LandingExperiment[];
    briefs: readonly LandingExperimentBrief[];
  }>,
): readonly ExperimentActivationIssue[] {
  const experiments = validateExperimentRegistry(input.experiments);
  const briefs = validateExperimentBriefRegistry(input.briefs);
  const experimentIdentities = new Set(experiments.map(experimentIdentity));
  const issues: ExperimentActivationIssue[] = [];

  for (const experiment of experiments.filter(({ enabled }) => enabled)) {
    const key = experimentIdentity(experiment);
    const brief = briefs.find((candidate) => briefIdentity(candidate) === key);
    if (!brief) {
      issues.push({
        severity: 'error',
        code: 'experiment_brief_missing',
        path: `experiments.${key}`,
      });
      continue;
    }
    if (brief.status !== 'approved' || !allApprovalsGranted(brief)) {
      issues.push({
        severity: 'error',
        code: 'experiment_brief_not_approved',
        path: `briefs.${key}.approvals`,
      });
    }
    if (brief.reporting.status !== 'verified') {
      issues.push({
        severity: 'error',
        code: 'experiment_report_not_verified',
        path: `briefs.${key}.reporting`,
      });
    }
    if (!registryMatchesBrief(experiment, brief)) {
      issues.push({
        severity: 'error',
        code: 'experiment_brief_registry_mismatch',
        path: `experiments.${key}`,
      });
    }
  }

  for (const brief of briefs.filter(({ status }) => status === 'approved')) {
    const key = briefIdentity(brief);
    if (!experimentIdentities.has(key)) {
      issues.push({
        severity: 'error',
        code: 'experiment_definition_missing',
        path: `briefs.${key}`,
      });
    }
  }

  return issues.sort(
    (left, right) =>
      left.path.localeCompare(right.path) ||
      left.code.localeCompare(right.code),
  );
}

// Deliberately empty until a real A/A brief has human approval and a verified report.
export const landingExperimentBriefRegistry = validateExperimentBriefRegistry(
  [],
);
