import {
  DataTable,
  type DataTableColumnDef,
} from '../src/components/table/data-table';
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

type Row = { id: string; name: string };

const columns: DataTableColumnDef<Row>[] = [
  { accessorKey: 'name', header: 'Name' },
];
const data: Row[] = [
  { id: '1', name: 'One' },
  { id: '2', name: 'Two' },
];

describe('DataTable', () => {
  it('renders an accessible external-pagination table without local controls', () => {
    render(
      <DataTable
        caption="Workout directory"
        columns={columns}
        data={data}
        getRowId={(row) => row.id}
        pagination={{ kind: 'none' }}
      />,
    );

    expect(screen.getByText('Workout directory')).toHaveClass('sr-only');
    expect(screen.getByRole('cell', { name: 'One' })).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Next' }),
    ).not.toBeInTheDocument();
  });

  it('keeps client pagination as the default behavior', () => {
    render(
      <DataTable
        caption="Paged directory"
        columns={columns}
        data={data}
        pagination={{ kind: 'client', pageSize: 1 }}
      />,
    );

    expect(screen.getByRole('cell', { name: 'One' })).toBeInTheDocument();
    expect(screen.queryByRole('cell', { name: 'Two' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('cell', { name: 'Two' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
    expect(screen.getByRole('cell', { name: 'One' })).toBeInTheDocument();
  });

  it('renders custom empty content', () => {
    render(
      <DataTable
        caption="Empty directory"
        columns={columns}
        data={[]}
        emptyContent={<span>No workouts yet</span>}
      />,
    );
    expect(screen.getByText('No workouts yet')).toBeInTheDocument();
  });

  it('supports consumer-defined accessible sorting controls', () => {
    const sortableColumns: DataTableColumnDef<Row>[] = [
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <button type="button" onClick={column.getToggleSortingHandler()}>
            Sort name
          </button>
        ),
      },
    ];
    render(
      <DataTable
        caption="Sortable directory"
        columns={sortableColumns}
        data={[...data].reverse()}
      />,
    );

    expect(screen.getAllByRole('cell').map((cell) => cell.textContent)).toEqual(
      ['Two', 'One'],
    );
    fireEvent.click(screen.getByRole('button', { name: 'Sort name' }));
    expect(screen.getAllByRole('cell').map((cell) => cell.textContent)).toEqual(
      ['One', 'Two'],
    );
  });

  it('supports initial visibility and row selection state', () => {
    const interactiveColumns: DataTableColumnDef<Row>[] = [
      {
        id: 'select',
        header: 'Select',
        cell: ({ row }) => (
          <button type="button" onClick={() => row.toggleSelected()}>
            {row.getIsSelected() ? 'Selected' : 'Select row'}
          </button>
        ),
      },
      { accessorKey: 'name', header: 'Name' },
    ];
    render(
      <DataTable
        caption="Selectable directory"
        columns={interactiveColumns}
        data={data}
        initialColumnVisibility={{ name: false }}
      />,
    );

    expect(
      screen.queryByRole('columnheader', { name: 'Name' }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: 'Select row' })[0]!);
    expect(screen.getByText('1 of 2 row(s) selected.')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Selected' }),
    ).toBeInTheDocument();
  });
});
