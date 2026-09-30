export function previewIntegration(enabled, contentSource) {
  return {
    name: 'mini-workout-secure-preview',
    hooks: {
      'astro:config:setup': ({ addMiddleware, injectRoute, injectScript }) => {
        if (!enabled) return;
        if (contentSource === 'strapi') {
          injectRoute({
            pattern: '/api/preview/strapi',
            entrypoint: new URL(
              './src/preview/strapi-enable-route.ts',
              import.meta.url,
            ),
            prerender: false,
          });
          injectRoute({
            pattern: '/api/webhooks/strapi/publish',
            entrypoint: new URL(
              './src/publish/strapi-publish-route.ts',
              import.meta.url,
            ),
            prerender: false,
          });
        } else {
          injectRoute({
            pattern: '/api/draft-mode/enable',
            entrypoint: new URL(
              './src/preview/enable-route.ts',
              import.meta.url,
            ),
            prerender: false,
          });
        }
        injectRoute({
          pattern: '/api/draft-mode/disable',
          entrypoint: new URL(
            './src/preview/disable-route.ts',
            import.meta.url,
          ),
          prerender: false,
        });
        if (contentSource === 'sanity') {
          injectRoute({
            pattern: '/api/webhooks/sanity/publish',
            entrypoint: new URL(
              './src/publish/publish-route.ts',
              import.meta.url,
            ),
            prerender: false,
          });
        }
        addMiddleware({
          order: 'pre',
          entrypoint: new URL('./src/preview/middleware.ts', import.meta.url),
        });
        if (contentSource === 'sanity') {
          injectScript('page', `import '/src/preview/visual-editing.ts';`);
        }
      },
    },
  };
}
