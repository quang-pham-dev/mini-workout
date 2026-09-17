import { AnimatedSuspense } from '../animated-suspense';
import { AppHeaderLogo } from './app-header-logo';
import { NavLinks, NavLinksFallback } from './nav-links';
import { PostHogIdentitySync } from '@/components/observability/posthog-bootstrap';
import { ThemeToggle } from '@/components/theme';
import { getInitials } from '@/lib/auth/initials';
import { getCurrentSession } from '@/lib/auth/session';

async function HeaderSessionNav() {
  const session = await getCurrentSession();
  const initials = getInitials(session?.user?.name, session?.user?.email);

  if (!initials) return null;

  return (
    <>
      <PostHogIdentitySync userId={session?.user?.id} />
      <NavLinks
        userInitials={initials}
        userName={session?.user?.name || undefined}
        userEmail={session?.user?.email || undefined}
      />
    </>
  );
}

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border-subtle bg-[color-mix(in_oklch,var(--color-background)_85%,transparent)] backdrop-blur-[16px]">
      <div className="relative mx-auto flex max-w-[76rem] items-center justify-between px-[clamp(1rem,5vw,5rem)] py-[0.9rem]">
        <AnimatedSuspense
          fallback={
            <span className="font-display text-[1.15rem] font-extrabold tracking-[-0.04em] text-text-primary">
              mini / workout
            </span>
          }
        >
          <AppHeaderLogo />
        </AnimatedSuspense>

        <div className="flex items-center gap-3">
          <AnimatedSuspense fallback={<NavLinksFallback />}>
            <HeaderSessionNav />
          </AnimatedSuspense>
          <ThemeToggle className="max-[768px]:hidden" />
        </div>
      </div>
    </header>
  );
}
