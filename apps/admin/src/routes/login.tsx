import { authClient } from '@/lib/auth-client';
import { safeInternalRedirect } from '@/lib/redirect';
import { Link, createFileRoute } from '@tanstack/react-router';
import { type FormEvent, useState } from 'react';
import { z } from 'zod';

const loginSearchSchema = z.object({ redirect: z.string().optional() });

export const Route = createFileRoute('/login')({
  validateSearch: loginSearchSchema,
  component: LoginPage,
});

function LoginPage() {
  const { redirect } = Route.useSearch();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(undefined);
    try {
      const form = new FormData(event.currentTarget);
      const result = await authClient.signIn.email({
        email: String(form.get('email') ?? ''),
        password: String(form.get('password') ?? ''),
      });

      if (result.error) {
        setError('The email or password is incorrect.');
        return;
      }

      window.location.assign(safeInternalRedirect(redirect));
    } catch {
      setError('Sign in is temporarily unavailable. Please try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-surface-sunken px-5 py-12">
      <section className="w-full max-w-md rounded-2xl border border-border-subtle bg-surface p-7 shadow-sm sm:p-9">
        <p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">
          Mini Workout
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">
          Admin sign in
        </h1>
        <p className="mt-2 text-sm text-text-secondary">
          Use an account with the administrator role.
        </p>

        <form className="mt-8 space-y-5" onSubmit={submit}>
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-border-default bg-surface px-3.5 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
          </div>
          <div>
            <label
              className="mb-2 block text-sm font-medium"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="w-full rounded-lg border border-border-default bg-surface px-3.5 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-error-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
          >
            {pending ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-text-secondary">
          <Link className="underline" to="/unauthorized">
            Having access trouble?
          </Link>
        </p>
      </section>
    </main>
  );
}
