import {
  AdminDirectoryHeader,
  NextPageLink,
} from '@/components/admin-directory';
import { AdminRouteError, AdminRoutePending } from '@/components/route-state';
import {
  type AdminWorkoutView,
  adminCursorSearchSchema,
  adminWorkoutsQueryOptions,
} from '@/features/admin';
import {
  DataTable,
  type DataTableColumnDef,
} from '@mini-workout/ui/data-table';
import { useSuspenseQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';

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
  errorComponent: ({ error, reset }) => (
    <AdminRouteError error={error} resource="workouts" reset={reset} />
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
      <div className="min-w-0 max-w-full overflow-x-auto rounded-2xl bg-surface shadow-sm">
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
