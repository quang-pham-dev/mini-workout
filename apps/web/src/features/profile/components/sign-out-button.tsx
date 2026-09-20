'use client';

import { useQueryClient } from '@tanstack/react-query';

export function SignOutButton() {
  const queryClient = useQueryClient();

  return (
    <button
      className="rounded-full border border-border-default bg-surface px-5 py-[0.6rem] text-sm font-medium text-text-secondary transition-[background-color,color,border-color] hover:border-border-strong hover:bg-surface-sunken hover:text-text-primary focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2"
      type="submit"
      onClick={() => queryClient.clear()}
    >
      Sign out
    </button>
  );
}
