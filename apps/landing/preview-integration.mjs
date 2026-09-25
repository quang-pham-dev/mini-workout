export function previewIntegration(enabled) {
  return {
    name: 'mini-workout-secure-preview',
    hooks: {
      'astro:config:setup': ({ addMiddleware, injectRoute, injectScript }) => {
        if (!enabled) return;
        injectRoute({
          pattern: '/api/draft-mode/enable',
          entrypoint: new URL('./src/preview/enable-route.ts', import.meta.url),
          prerender: false,
        });
        injectRoute({
          pattern: '/api/draft-mode/disable',
          entrypoint: new URL(
            './src/preview/disable-route.ts',
            import.meta.url,
          ),
          prerender: false,
        });
        addMiddleware({
          order: 'pre',
          entrypoint: new URL('./src/preview/middleware.ts', import.meta.url),
        });
        injectScript('page', `import '/src/preview/visual-editing.ts';`);
      },
    },
  };
}
