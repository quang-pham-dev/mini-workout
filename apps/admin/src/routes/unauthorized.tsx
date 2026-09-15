import { Link, createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/unauthorized')({
  component: UnauthorizedPage,
});

function UnauthorizedPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-surface-sunken p-6">
      <section className="max-w-lg rounded-2xl border border-border-subtle bg-surface p-8 text-center shadow-sm">
        <p className="text-xs font-bold tracking-[0.16em] text-primary uppercase">
          Access denied
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Administrator access required
        </h1>
        <p className="mt-3 text-sm text-text-secondary">
          Your account is signed in but does not have permission to use this
          workspace.
        </p>
        <Link
          className="mt-7 inline-block rounded-lg border border-border-default px-4 py-2 text-sm font-medium hover:bg-surface-sunken"
          to="/login"
        >
          Sign in with another account
        </Link>
      </section>
    </main>
  );
}
