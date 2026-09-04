import { registerAction } from './actions';
import Link from 'next/link';

type RegisterContentProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function RegisterContent({ searchParams }: RegisterContentProps) {
  const params = await searchParams;
  const callbackUrl =
    typeof params.callbackUrl === 'string' ? params.callbackUrl : '/home';

  return (
    <main className="grid min-h-[100svh] place-items-center bg-background px-4 py-8">
      <section
        className="w-[min(100%,28rem)] rounded-2xl border border-border-default bg-surface p-8 shadow-[0_1rem_3rem_color-mix(in_srgb,var(--color-foreground)_8%,transparent)]"
        aria-labelledby="register-title"
      >
        <h1
          className="m-0 text-[1.75rem] text-text-primary"
          id="register-title"
        >
          Create your account
        </h1>
        <p className="mt-2 mb-6 text-text-secondary">
          Start building a consistent workout habit.
        </p>
        {typeof params.error === 'string' ? (
          <p
            className="rounded-lg bg-[color-mix(in_srgb,var(--color-destructive)_12%,transparent)] p-3 text-sm text-destructive"
            role="alert"
          >
            Unable to create your account. Check your details and try again.
          </p>
        ) : null}
        <form action={registerAction} className="grid gap-4">
          <input name="callbackUrl" type="hidden" value={callbackUrl} />
          <div className="grid gap-[0.4rem] [&_label]:text-sm [&_label]:font-semibold [&_label]:text-text-primary [&_input]:min-h-11 [&_input]:rounded-lg [&_input]:border [&_input]:border-border-default [&_input]:bg-background [&_input]:px-3 [&_input]:py-2 [&_input]:text-text-primary">
            <label htmlFor="name">Name</label>
            <input
              autoComplete="name"
              id="name"
              name="name"
              required
              type="text"
            />
          </div>
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
              autoComplete="new-password"
              id="password"
              minLength={8}
              name="password"
              required
              type="password"
            />
          </div>
          <div className="grid gap-[0.4rem] [&_label]:text-sm [&_label]:font-semibold [&_label]:text-text-primary [&_input]:min-h-11 [&_input]:rounded-lg [&_input]:border [&_input]:border-border-default [&_input]:bg-background [&_input]:px-3 [&_input]:py-2 [&_input]:text-text-primary">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              autoComplete="new-password"
              id="confirmPassword"
              minLength={8}
              name="confirmPassword"
              required
              type="password"
            />
          </div>
          <button
            className="min-h-11 rounded-lg bg-primary font-semibold text-primary-foreground"
            type="submit"
          >
            Create account
          </button>
        </form>
        <p className="mt-5 text-center text-sm text-text-secondary [&_a]:font-semibold [&_a]:text-primary">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
