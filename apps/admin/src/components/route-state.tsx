'use client';

import { useEffect } from 'react';

export function AdminRoutePending({ resource }: { resource: string }) {
  return (
    <section
      className="mx-auto max-w-7xl rounded-2xl border border-border-subtle bg-surface px-6 py-16 text-center shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div
        className="mx-auto size-8 animate-spin rounded-full border-2 border-border-default text-primary"
        style={{ borderTopColor: 'currentColor' }}
      />
      <p className="mt-4 text-sm text-text-secondary">Loading {resource}…</p>
    </section>
  );
}

export function AdminRouteError({
  resource,
  reset,
  error,
}: {
  resource: string;
  reset: () => void;
  error?: unknown;
}) {
  useEffect(() => {
    if (!error) return;
    window.dispatchEvent(
      new CustomEvent('mini-workout:admin-error', {
        detail: {
          error: new Error('Unhandled admin application error'),
          properties: {
            error_code: 'INTERNAL_ERROR',
            error_category: 'internal',
            service: 'admin',
            route_template: `admin/${resource}`,
            operation: 'route.render',
          },
        },
      }),
    );
  }, [error, resource]);

  return (
    <section
      className="mx-auto max-w-2xl rounded-2xl border border-border-subtle bg-surface px-6 py-14 text-center shadow-sm"
      role="alert"
    >
      <h1 className="text-xl font-semibold">Unable to load {resource}</h1>
      <p className="mt-2 text-sm text-text-secondary">
        Something went wrong. No changes were made.
      </p>
      <button
        type="button"
        className="mt-6 rounded-lg border border-border-default bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        onClick={reset}
      >
        Try again
      </button>
    </section>
  );
}
