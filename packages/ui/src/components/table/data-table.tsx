import { Button } from '@/components/button/button';
import { cn } from '@/lib/utils';
import {
  type ColumnDef,
  type ColumnVisibilityState,
  type RowData,
  type RowSelectionState,
  type SortingState,
  columnFilteringFeature,
  columnVisibilityFeature,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  flexRender,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import React, { useState } from 'react';

export type DataTablePagination =
  { kind: 'client'; pageSize?: number } | { kind: 'none' };

const features = tableFeatures({
  columnFilteringFeature,
  columnVisibilityFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
});

export type DataTableColumnDef<TData extends RowData> = ColumnDef<
  typeof features,
  TData,
  unknown
>;

interface DataTableProps<TData extends RowData> {
  columns: DataTableColumnDef<TData>[];
  data: TData[];
  caption: string;
  pagination?: DataTablePagination;
  emptyContent?: React.ReactNode;
  getRowId?: (row: TData) => string;
  initialColumnVisibility?: ColumnVisibilityState;
  className?: string;
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  caption,
  pagination = { kind: 'client', pageSize: 10 },
  emptyContent = 'No results.',
  getRowId,
  initialColumnVisibility = {},
  className,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] =
    useState<ColumnVisibilityState>(initialColumnVisibility);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  const table = useTable({
    features,
    data,
    columns,
    getRowId,
    manualPagination: pagination.kind === 'none',
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageIndex: 0,
        pageSize:
          pagination.kind === 'client' ? (pagination.pageSize ?? 10) : 10,
      },
    },
  });

  return (
    <div className={cn('w-full space-y-4', className)}>
      <div className="rounded-md border border-border">
        <table className="w-full caption-bottom text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="border-b border-border bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="h-10 px-4 text-left align-middle font-medium text-muted-foreground"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-border transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                >
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="p-4 align-middle">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="h-24 p-4 text-center text-muted-foreground"
                >
                  {emptyContent}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {pagination.kind === 'client' && (
        <div className="flex items-center justify-between px-2">
          <div className="text-muted-foreground text-sm">
            {table.getFilteredSelectedRowModel().rows.length} of{' '}
            {table.getFilteredRowModel().rows.length} row(s) selected.
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
