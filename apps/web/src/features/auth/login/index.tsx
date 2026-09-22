import { LoginForm } from './components/login-form';
import { SearchParams } from '@/types/common';

type LoginContentProps = {
  searchParams: SearchParams;
};

export async function LoginContent({ searchParams }: LoginContentProps) {
  const params = await searchParams;
  const callbackUrl =
    typeof params.callbackUrl === 'string' ? params.callbackUrl : '/home';
  const hasRegistrationSuccess = params.registered === '1';
  const hasPasswordResetSuccess = params.reset === '1';

  return (
    <main className="grid min-h-[100svh] place-items-center bg-background px-4 py-8">
      <section
        className="w-[min(100%,28rem)] rounded-2xl border border-border-default bg-surface p-8 shadow-[0_1rem_3rem_color-mix(in_srgb,var(--color-foreground)_8%,transparent)]"
        aria-labelledby="login-title"
      >
        <h1
          className="m-0 text-[1.75rem] text-center text-text-primary"
          id="login-title"
        >
          Welcome back
        </h1>
        <p className="mt-2 mb-6 text-center text-text-secondary">
          Sign in to continue your workout journey.
        </p>
        {hasRegistrationSuccess ? (
          <p role="status" className="text-center">
            Your account is ready. Please sign in.
          </p>
        ) : null}
        {hasPasswordResetSuccess ? (
          <p role="status" className="text-center">
            Your password was updated. Please sign in.
          </p>
        ) : null}

        <LoginForm callbackUrl={callbackUrl} />
      </section>
    </main>
  );
}
