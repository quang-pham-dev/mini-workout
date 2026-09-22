'use client';

import {
  type RecoveryFormState,
  type ResetPasswordFormState,
  type VerificationFormState,
  requestPasswordResetAction,
  resendVerificationAction,
  resetPasswordAction,
} from './actions';
import { SubmitButton } from '@/components/auth/submit-button';
import { useActionState } from 'react';

const recoveryInitial: RecoveryFormState = { error: null };
const resetInitial: ResetPasswordFormState = { error: null };
const verificationInitial: VerificationFormState = { error: null };

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    requestPasswordResetAction,
    recoveryInitial,
  );
  return state.submitted ? (
    <p role="status">If an account matches, we sent a password reset link.</p>
  ) : (
    <form action={action} className="grid gap-4">
      {state.error ? <p role="alert">{state.error}</p> : null}
      <label className="grid gap-2 text-sm font-semibold" htmlFor="email">
        Email
        <input
          className="min-h-11 rounded-lg border px-3"
          id="email"
          name="email"
          required
          type="email"
        />
      </label>
      <SubmitButton
        isPending={pending}
        pendingText="Sending…"
        text="Send reset link"
      />
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(
    resetPasswordAction,
    resetInitial,
  );
  return (
    <form action={action} className="grid gap-4">
      <input name="token" type="hidden" value={token} />
      {state.error ? <p role="alert">{state.error}</p> : null}
      <label className="grid gap-2 text-sm font-semibold" htmlFor="newPassword">
        New password
        <input
          className="min-h-11 rounded-lg border px-3"
          id="newPassword"
          minLength={8}
          name="newPassword"
          required
          type="password"
        />
      </label>
      <SubmitButton
        isPending={pending}
        pendingText="Updating…"
        text="Update password"
      />
    </form>
  );
}

export function ResetPasswordFormSkeleton() {
  return (
    <div
      aria-label="Loading password reset form"
      className="grid animate-pulse gap-4"
      role="status"
    >
      <div className="grid gap-2">
        <div className="h-5 w-28 rounded bg-border-default" />
        <div className="min-h-11 rounded-lg bg-border-default" />
      </div>
      <div className="min-h-11 rounded-lg bg-border-default" />
    </div>
  );
}

export function ResendVerificationForm() {
  const [state, action, pending] = useActionState(
    resendVerificationAction,
    verificationInitial,
  );
  return state.sent ? (
    <p role="status">
      If an account matches, a verification email is on its way.
    </p>
  ) : (
    <form action={action} className="grid gap-4">
      {state.error ? <p role="alert">{state.error}</p> : null}
      <label className="grid gap-2 text-sm font-semibold" htmlFor="email">
        Email
        <input
          className="min-h-11 rounded-lg border px-3"
          id="email"
          name="email"
          required
          type="email"
        />
      </label>
      <SubmitButton
        isPending={pending}
        pendingText="Sending…"
        text="Resend verification email"
      />
    </form>
  );
}
