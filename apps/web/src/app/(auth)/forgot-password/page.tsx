import { ForgotPasswordForm } from '@/features/auth/recovery';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Forgot password' };

export default function ForgotPasswordPage() {
  return (
    <main className="grid min-h-[100svh] place-items-center bg-background px-4 py-8">
      <section
        className="w-[min(100%,28rem)] rounded-2xl border border-border-default bg-surface p-8"
        aria-labelledby="forgot-password-title"
      >
        <h1
          className="m-0 text-center text-[1.75rem]"
          id="forgot-password-title"
        >
          Reset your password
        </h1>
        <p className="mb-6 mt-2 text-center text-text-secondary">
          We will send a secure reset link if the account exists.
        </p>
        <ForgotPasswordForm />
      </section>
    </main>
  );
}
