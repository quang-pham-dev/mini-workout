import type { ExperimentAssignment } from './experiment-registry';
import type { ExperimentTarget } from './experiment-runtime';

const targetSelector = '[data-experiment-id]';
const ctaSelector = '[data-cross-app-navigation="true"]';

function createTarget(element: HTMLElement): ExperimentTarget | undefined {
  const experimentId = element.dataset.experimentId;
  if (!experimentId) return undefined;

  return {
    experimentId,
    applyAssignment: (assignment: ExperimentAssignment) => {
      element.dataset.experimentVariant = assignment.variantId;
      element.dataset.experimentExperience = assignment.experienceKey;
      const ctas = [
        ...(element.matches(ctaSelector) ? [element] : []),
        ...element.querySelectorAll<HTMLElement>(ctaSelector),
      ];
      for (const cta of ctas) {
        cta.dataset.analyticsExperimentId = `${assignment.experimentId}.v${assignment.experimentVersion}`;
        cta.dataset.analyticsVariantId = assignment.variantId;
      }
      element.dispatchEvent(
        new CustomEvent('mini-workout:experiment-assigned', {
          detail: assignment,
        }),
      );
    },
    observeOnce: (onVisible) => {
      if (!('IntersectionObserver' in window)) return;
      const observer = new IntersectionObserver(
        (entries) => {
          if (!entries.some((entry) => entry.isIntersecting)) return;
          observer.disconnect();
          onVisible();
        },
        { threshold: 0.5 },
      );
      observer.observe(element);
    },
  };
}

export function browserExperimentTargets(): readonly ExperimentTarget[] {
  return [...document.querySelectorAll<HTMLElement>(targetSelector)]
    .map(createTarget)
    .filter((target): target is ExperimentTarget => target !== undefined);
}
