import { authClient } from '@/lib/auth-client';
import { useState } from 'react';

export function SignOutButton() {
  const [pending, setPending] = useState(false);

  return (
    <button
      type="button"
      className="rounded-lg px-3 py-2.5 text-left text-sm font-medium text-text-secondary hover:bg-surface-sunken hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        await authClient.signOut();
        window.location.assign('/login');
      }}
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
