import { Link } from '@tanstack/react-router';

export function AdminDirectoryHeader({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl" aria-labelledby={`${title}-title`}>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.16em] text-primary uppercase">
            {eyebrow}
          </p>
          <h1
            id={`${title}-title`}
            className="text-3xl font-semibold tracking-tight"
          >
            {title}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">{description}</p>
        </div>
        <span className="rounded-full border border-border-subtle bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary">
          Read-only workspace
        </span>
      </div>
      {children}
    </section>
  );
}

export function NextPageLink({
  to,
  cursor,
  label,
}: {
  to: '/workouts' | '/coaches';
  cursor: string;
  label: string;
}) {
  return (
    <div className="mt-6 flex justify-end">
      <Link
        className="rounded-lg border border-border-default bg-surface px-4 py-2 text-sm font-medium hover:bg-surface-sunken"
        to={to}
        search={{ cursor }}
      >
        Next page<span className="sr-only"> of {label}</span> →
      </Link>
    </div>
  );
}
