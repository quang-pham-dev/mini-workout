import { auditLandingOperations } from '../src/operations/operational-audit.js';

try {
  const [{ publishedContentRepository }, { landingExperimentRegistry }] =
    await Promise.all([
      import('../src/content/published-content-repository.js'),
      import('../src/experimentation/experiment-registry.js'),
    ]);
  const content = await publishedContentRepository.load();
  const issues = auditLandingOperations({
    content,
    experiments: landingExperimentRegistry,
    now: new Date(),
    campaignWarningDays: 7,
    archiveReviewDays: 30,
    experimentWarningDays: 7,
  });
  for (const issue of issues) {
    const output = `${issue.severity}:${issue.code}:${issue.path}`;
    if (issue.severity === 'error') console.error(output);
    else console.warn(output);
  }
  if (issues.some(({ severity }) => severity === 'error')) {
    process.exitCode = 1;
  } else {
    console.log(
      `Landing operational audit passed (${issues.length} warnings).`,
    );
  }
} catch {
  console.error('error:landing_operational_audit_failed:repository');
  process.exitCode = 1;
}
