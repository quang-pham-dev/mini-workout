'use client';

import { type RegisterFormState, registerAction } from '../actions';
import { RegisterFormFooter } from './register-form-footer';
import { SubmitButton } from '@/components/auth/submit-button';
import { useActionState } from 'react';

const initialState: RegisterFormState = { error: null };

type RegisterFormProps = {
  callbackUrl: string;
};

export function RegisterForm({ callbackUrl }: RegisterFormProps) {
  const [state, formAction, isPending] = useActionState(
    registerAction,
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

        <SubmitButton
          isPending={isPending}
          text="Create account"
          pendingText="Creating account…"
        />
      </form>

      <RegisterFormFooter />
    </>
  );
}
