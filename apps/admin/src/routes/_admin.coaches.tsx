import { NextPageLink } from './_admin.workouts';
import { AdminRouteError, AdminRoutePending } from '@/components/route-state';
import type { AdminCoachView } from '@/features/admin/contracts';
import { adminCursorSearchSchema } from '@/features/admin/contracts';
import { adminCoachesQueryOptions } from '@/features/admin/query-options';
import {
  DataTable,
  type DataTableColumnDef,
} from '@mini-workout/ui/data-table';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

const columns: DataTableColumnDef<AdminCoachView>[] = [
  {
    accessorKey: 'name',
    header: 'Coach',
    cell: ({ row }) => (
      <div>
        <span className="block font-medium">{row.original.name}</span>
        <span className="mt-1 block text-text-tertiary">
          /{row.original.slug}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'bio',
    header: 'Bio',
    cell: ({ row }) => (
      <span className="line-clamp-2 max-w-sm">{row.original.bio}</span>
    ),
  },
  {
    accessorKey: '_count.workouts',
    header: 'Workouts',
    cell: ({ row }) => row.original._count.workouts,
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

export const Route = createFileRoute('/_admin/coaches')({
  validateSearch: adminCursorSearchSchema,
  loaderDeps: ({ search }) => ({ cursor: search.cursor }),
  loader: ({ context, deps }) =>
    context.queryClient.ensureQueryData(adminCoachesQueryOptions(deps.cursor)),
  pendingComponent: () => <AdminRoutePending resource="coaches" />,
  errorComponent: ({ reset }) => (
    <AdminRouteError resource="coaches" reset={reset} />
  ),
  component: CoachesPage,
});

function CoachesPage() {
  const { cursor } = Route.useSearch();
  const { data } = useSuspenseQuery(adminCoachesQueryOptions(cursor));
  return (
    <section className="mx-auto max-w-7xl" aria-labelledby="coaches-title">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-bold tracking-[0.16em] text-primary uppercase">
            People
          </p>
          <h1
            id="coaches-title"
            className="text-3xl font-semibold tracking-tight"
          >
            Coaches
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            See who is guiding the workout library. Editing controls are coming
            in the next phase.
          </p>
        </div>
        <span className="rounded-full border border-border-subtle bg-surface px-3 py-1.5 text-xs font-medium text-text-secondary">
          Read-only workspace
        </span>
      </div>
      <div className="overflow-x-auto rounded-2xl bg-surface shadow-sm">
        <DataTable
          caption="Coach directory"
          columns={columns}
          data={data.items}
          getRowId={(row) => row.id}
          pagination={{ kind: 'none' }}
          emptyContent="No coaches on this page."
          className="min-w-[600px]"
        />
      </div>
      {data.nextCursor && (
        <NextPageLink to="/coaches" cursor={data.nextCursor} label="coaches" />
      )}
    </section>
  );
}
