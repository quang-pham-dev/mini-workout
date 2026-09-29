import {
  assessExperimentActivationReadiness,
  landingExperimentBriefRegistry,
} from '../src/experimentation/experiment-brief.js';
import { landingExperimentRegistry } from '../src/experimentation/experiment-registry.js';

try {
  const issues = assessExperimentActivationReadiness({
    experiments: landingExperimentRegistry,
    briefs: landingExperimentBriefRegistry,
  });
  for (const issue of issues) {
    console.error(`${issue.severity}:${issue.code}:${issue.path}`);
  }
  if (issues.length > 0) {
    process.exitCode = 1;
  } else {
    console.log('Landing experiment readiness passed.');
  }
} catch {
  console.error('error:experiment_readiness_invalid:registry');
  process.exitCode = 1;
}
