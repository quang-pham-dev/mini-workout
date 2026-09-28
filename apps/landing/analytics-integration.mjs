export function analyticsIntegration(enabled) {
  return {
    name: 'mini-workout-consent-analytics',
    hooks: {
      'astro:config:setup': ({ injectScript }) => {
        if (!enabled) return;
        injectScript('page', `import '/src/analytics/landing-entry.ts';`);
      },
    },
  };
}
