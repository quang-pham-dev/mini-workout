import appCss from '../styles.css?url';
import type { QueryClient } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import {
  HeadContent,
  Link,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/react-router-devtools';
import type { ReactNode } from 'react';

interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Mini Workout Admin' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
  notFoundComponent: () => (
    <main className="grid min-h-screen place-items-center bg-surface-sunken p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">Page not found</h1>
        <Link
          className="mt-4 inline-block text-primary underline"
          to="/workouts"
        >
          Return to workouts
        </Link>
      </div>
    </main>
  ),
});

function RootDocument({ children }: { children: ReactNode }) {
  // DEV is a Vite compile-time constant, not a deploy-time environment input.
  // eslint-disable-next-line turbo/no-undeclared-env-vars
  const showDevtools = import.meta.env.DEV;
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        {showDevtools && (
          <>
            <ReactQueryDevtools initialIsOpen={false} />
            <TanStackRouterDevtools position="bottom-right" />
          </>
        )}
        <Scripts />
      </body>
    </html>
  );
}
