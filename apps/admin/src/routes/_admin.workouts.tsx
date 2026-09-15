import { AdminRouteError, AdminRoutePending } from '@/components/route-state';
import type { AdminWorkoutView } from '@/features/admin/contracts';
import { adminCursorSearchSchema } from '@/features/admin/contracts';
import { adminWorkoutsQueryOptions } from '@/features/admin/query-options';
import {
  DataTable,
  type DataTableColumnDef,
} from '@mini-workout/ui/data-table';
import { useSuspenseQuery } from '@tanstack/react-query';
import { Link, createFileRoute } from '@tanstack/react-router';

const columns: DataTableColumnDef<AdminWorkoutView>[] = [
  {
    accessorKey: 'title',
    header: 'Workout',
    cell: ({ row }) => (
      <div>
        <span className="block font-medium">{row.original.title}</span>
        <span className="mt-1 block text-text-tertiary">
          /{row.original.slug} · {row.original.durationMinutes} min
        </span>
      </div>
    ),
  },
  { accessorKey: 'coach.name', header: 'Coach' },
  { accessorKey: 'category.name', header: 'Category' },
  {
    accessorKey: 'level',
    header: 'Level',
    cell: ({ row }) => row.original.level.toLowerCase(),
  },
  {
    accessorKey: 'isPublished',
    header: 'Status',
    cell: ({ row }) => (
      <span
        className={
          row.original.isPublished
            ? 'rounded-full bg-success-100 px-2.5 py-1 text-xs font-semibold text-success-900'
            : 'rounded-full bg-warning-100 px-2.5 py-1 text-xs font-semibold text-warning-950'
        }
      >
        {row.original.isPublished ? 'Published' : 'Draft'}
      </span>
    ),
  },
  {
    accessorKey: 'updatedAt',
    header: 'Updated',
    cell: ({ row }) =>
      new Date(row.original.updatedAt).toLocaleDateString('en-US', {
        timeZone: 'UTC',
      }),
  },
];

export const Route = createFileRoute('/_admin/workouts')({
  validateSearch: adminCursorSearchSchema,
  loaderDeps: ({ search }) => ({ cursor: search.cursor }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(adminWorkoutsQueryOptions(deps.cursor)),
  pendingComponent: () => <AdminRoutePending resource="workouts" />,
  errorComponent: ({ reset }) => (
    <AdminRouteError resource="workouts" reset={reset} />
  ),
  component: WorkoutsPage,
});

function WorkoutsPage() {
  const { cursor } = Route.useSearch();
  const { data } = useSuspenseQuery(adminWorkoutsQueryOptions(cursor));
  return (
    <AdminDirectoryHeader
      eyebrow="Content library"
      title="Workouts"
      description="Review published sessions and drafts. Editing controls are coming in the next phase."
    >
      <div className="overflow-x-auto rounded-2xl bg-surface shadow-sm">
        <DataTable
          caption="Workout publishing overview"
          columns={columns}
          data={data.items}
          getRowId={(row) => row.id}
          pagination={{ kind: 'none' }}
          emptyContent="No workouts on this page."
          className="min-w-[760px]"
        />
      </div>
      {data.nextCursor && (
        <NextPageLink
          to="/workouts"
          cursor={data.nextCursor}
          label="workouts"
        />
      )}
    </AdminDirectoryHeader>
  );
}

function AdminDirectoryHeader({
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
