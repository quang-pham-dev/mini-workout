import { loginAction } from './actions';
import Link from 'next/link';

type LoginContentProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function LoginContent({ searchParams }: LoginContentProps) {
  const params = await searchParams;
  const callbackUrl =
    typeof params.callbackUrl === 'string' ? params.callbackUrl : '/home';
  const hasRegistrationSuccess = params.registered === '1';

  return (
    <main className="grid min-h-[100svh] place-items-center bg-background px-4 py-8">
      <section
        className="w-[min(100%,28rem)] rounded-2xl border border-border-default bg-surface p-8 shadow-[0_1rem_3rem_color-mix(in_srgb,var(--color-foreground)_8%,transparent)]"
        aria-labelledby="login-title"
      >
        <h1 className="m-0 text-[1.75rem] text-text-primary" id="login-title">
          Welcome back
        </h1>
        <p className="mt-2 mb-6 text-text-secondary">
          Sign in to continue your workout journey.
        </p>
        {hasRegistrationSuccess ? (
          <p role="status">Your account is ready. Please sign in.</p>
        ) : null}
        {typeof params.error === 'string' ? (
          <p
            className="rounded-lg bg-[color-mix(in_srgb,var(--color-destructive)_12%,transparent)] p-3 text-sm text-destructive"
            role="alert"
          >
            Invalid email or password.
          </p>
        ) : null}
        <form action={loginAction} className="grid gap-4">
          <input name="callbackUrl" type="hidden" value={callbackUrl} />
          <div className="grid gap-[0.4rem] [&_label]:text-sm [&_label]:font-semibold [&_label]:text-text-primary [&_input]:min-h-11 [&_input]:rounded-lg [&_input]:border [&_input]:border-border-default [&_input]:bg-background [&_input]:px-3 [&_input]:py-2 [&_input]:text-text-primary">
            <label htmlFor="email">Email</label>
            <input
              autoComplete="email"
              id="email"
              name="email"
              required
              type="email"
            />
          </div>
          <div className="grid gap-[0.4rem] [&_label]:text-sm [&_label]:font-semibold [&_label]:text-text-primary [&_input]:min-h-11 [&_input]:rounded-lg [&_input]:border [&_input]:border-border-default [&_input]:bg-background [&_input]:px-3 [&_input]:py-2 [&_input]:text-text-primary">
            <label htmlFor="password">Password</label>
            <input
              autoComplete="current-password"
              id="password"
              name="password"
              required
              type="password"
            />
          </div>
          <button
            className="min-h-11 rounded-lg bg-primary font-semibold text-primary-foreground"
            type="submit"
          >
            Sign in
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-text-secondary [&_a]:font-semibold [&_a]:text-primary">
          New to Mini Workout? <Link href="/register">Create an account</Link>
        </p>
      </section>
    </main>
  );
}
