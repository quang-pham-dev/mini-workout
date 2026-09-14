import { RegisterForm } from './components/register-form';
import { SearchParams } from '@/types/common';

type RegisterContentProps = {
  searchParams: SearchParams;
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
          className="m-0 text-center text-[1.75rem] text-text-primary"
          id="register-title"
        >
          Create your account
        </h1>
        <p className="mt-2 mb-6 text-center text-text-secondary">
          Start building a consistent workout habit.
        </p>
        {typeof params.error === 'string' ? (
          <p
            className="rounded-lg bg-[color-mix(in_srgb,var(--color-destructive)_12%,transparent)] p-3 text-center text-sm text-destructive"
            role="alert"
          >
            Unable to create your account. Check your details and try again.
          </p>
        ) : null}

        <RegisterForm callbackUrl={callbackUrl} />
      </section>
    </main>
  );
}
