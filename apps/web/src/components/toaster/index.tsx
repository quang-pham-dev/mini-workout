'use client';

import { useTheme } from '../theme';
import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  const { resolvedTheme } = useTheme();

  return (
    <div
      style={{ viewTransitionName: 'toaster' }}
      className="pointer-events-none fixed inset-0 z-9999"
    >
      <SonnerToaster
        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
        position="bottom-right"
      />
    </div>
  );
}
