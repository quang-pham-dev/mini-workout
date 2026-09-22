'use client';

import { type LoginFormState, loginAction } from '../actions';
import { LoginFormFooter } from './login-form-footer';
import { SubmitButton } from '@/components/auth/submit-button';
import Link from 'next/link';
import { useActionState } from 'react';

const initialState: LoginFormState = { error: null };

type LoginFormProps = {
  callbackUrl: string;
};

export function LoginForm({ callbackUrl }: LoginFormProps) {
  const [state, formAction, isPending] = useActionState(
    loginAction,
    initialState,
  );

  return (
    <>
      <form action={formAction} className="grid gap-4">
        <input name="callbackUrl" type="hidden" value={callbackUrl} />

        {state.error ? (
          <p
            className="rounded-lg bg-[color-mix(in_srgb,var(--color-destructive)_12%,transparent)] p-3 text-center text-sm text-destructive"
            role="alert"
          >
            {state.error}
          </p>
        ) : null}
        {state.needsVerification ? (
          <p className="-mt-2 text-center text-sm">
            <Link className="font-semibold text-primary" href="/verify-email">
              Resend verification email
            </Link>
          </p>
        ) : null}

        <div className="grid gap-[0.4rem] [&_label]:text-sm [&_label]:font-semibold [&_label]:text-text-primary [&_input]:min-h-11 [&_input]:rounded-lg [&_input]:border [&_input]:border-border-default [&_input]:bg-background [&_input]:px-3 [&_input]:py-2 [&_input]:text-text-primary">
          <label htmlFor="email">Email</label>
          <input
            autoComplete="email"
            defaultValue={state.email ?? ''}
            disabled={isPending}
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
            disabled={isPending}
            id="password"
            name="password"
            required
            type="password"
          />
        </div>

        <SubmitButton
          isPending={isPending}
          text="Sign in"
          pendingText="Signing in…"
        />
      </form>

      <LoginFormFooter />
    </>
  );
}
