import { AppHeader } from '@/components/navigation/app-header';

type AppLayoutProps = {
  children: React.ReactNode;
};

/**
 * Shared layout for all (app) routes.
 *
 * Auth guards are handled at two layers:
 *  1. Edge middleware (proxy.ts) — redirects unauthenticated requests to /login.
 *  2. Per-page streamed components — each calls requireSession() inside <Suspense>,
 *     which keeps the layout itself statically prerenderable for instant navigation.
 *
 * Onboarding redirect is handled inside OnboardingContent and home-sections
 * components rather than here, so the layout never reads dynamic data outside
 * a Suspense boundary.
 */
export default function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      <AppHeader />
      {children}
    </>
  );
}
