import { SignOutButton } from './sign-out-button';
import { Link, Outlet } from '@tanstack/react-router';

const navigation = [
  { to: '/workouts' as const, label: 'Workouts' },
  { to: '/coaches' as const, label: 'Coaches' },
];

export function AdminShell() {
  return (
    <div className="min-h-screen bg-surface-sunken lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
      <aside className="border-b border-border-subtle bg-surface lg:min-h-screen lg:border-r lg:border-b-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-5 lg:sticky lg:top-0 lg:block lg:px-6 lg:py-8">
          <div>
            <p className="text-xs font-bold tracking-[0.18em] text-primary uppercase">
              Mini Workout
            </p>
            <p className="mt-1 text-lg font-semibold tracking-tight">
              Operations
            </p>
          </div>
          <nav
            aria-label="Admin navigation"
            className="flex gap-2 text-sm lg:mt-9 lg:flex-col"
          >
            {navigation.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                activeProps={{ 'aria-current': 'page' }}
                className="rounded-lg px-3 py-2.5 font-medium text-text-secondary hover:bg-surface-sunken hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring aria-[current=page]:bg-surface-sunken aria-[current=page]:text-text-primary"
              >
                {item.label}
              </Link>
            ))}
            <SignOutButton />
          </nav>
        </div>
      </aside>
      <main className="min-w-0 px-5 py-8 sm:px-8 lg:px-12 lg:py-12">
        <Outlet />
      </main>
    </div>
  );
}
