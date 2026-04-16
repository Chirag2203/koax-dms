'use client';

import { useState, useMemo, type ReactNode } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
  type ColumnFiltersState,
  type VisibilityState,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, ChevronsUpDown, ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';
import { cn } from '@dms/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DataTableProps<T> {
  columns: ColumnDef<T>[];
  data: T[];
  emptyState?: ReactNode;
  density?: 'compact' | 'default' | 'relaxed';
  onRowClick?: (row: T) => void;
  enableSelection?: boolean;
  bulkActions?: ReactNode;
  enableColumnConfig?: boolean;
  pageSize?: number;
}

// ─── Row height per density ───────────────────────────────────────────────────

const DENSITY_ROW_HEIGHT: Record<NonNullable<DataTableProps<unknown>['density']>, string> = {
  compact: 'h-11',   // 44px
  default: 'h-14',   // 56px
  relaxed: 'h-[68px]',
};

// ─── Checkbox column factory ──────────────────────────────────────────────────

function buildCheckboxColumn<T>(): ColumnDef<T> {
  return {
    id: '__select__',
    header: ({ table }) => (
      <input
        type="checkbox"
        checked={table.getIsAllPageRowsSelected()}
        ref={(el) => {
          if (el) {
            el.indeterminate = table.getIsSomePageRowsSelected();
          }
        }}
        onChange={table.getToggleAllPageRowsSelectedHandler()}
        aria-label="Select all rows"
        className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
      />
    ),
    cell: ({ row }) => (
      <input
        type="checkbox"
        checked={row.getIsSelected()}
        onChange={row.getToggleSelectedHandler()}
        aria-label={`Select row ${row.index + 1}`}
        className="h-4 w-4 rounded border-line text-accent focus:ring-accent"
      />
    ),
    size: 48,
    enableSorting: false,
    enableHiding: false,
  };
}

// ─── Sort icon ────────────────────────────────────────────────────────────────

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ChevronUp className="h-3.5 w-3.5 text-accent" aria-hidden="true" />;
  if (sorted === 'desc') return <ChevronDown className="h-3.5 w-3.5 text-accent" aria-hidden="true" />;
  return <ChevronsUpDown className="h-3.5 w-3.5 text-ink-muted opacity-50" aria-hidden="true" />;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DataTable<T>({
  columns,
  data,
  emptyState,
  density = 'default',
  onRowClick,
  enableSelection = false,
  bulkActions,
  enableColumnConfig = false,
  pageSize: initialPageSize = 50,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [showColumnConfig, setShowColumnConfig] = useState(false);

  // Prepend checkbox column if selection is enabled
  const effectiveColumns = useMemo<ColumnDef<T>[]>(() => {
    if (enableSelection) {
      return [buildCheckboxColumn<T>(), ...columns];
    }
    return columns;
  }, [columns, enableSelection]);

  const table = useReactTable<T>({
    data,
    columns: effectiveColumns,
    state: {
      sorting,
      rowSelection,
      columnFilters,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: { pageSize: initialPageSize },
    },
  });

  const { pageIndex, pageSize } = table.getState().pagination;
  const totalRows = table.getFilteredRowModel().rows.length;
  const selectedCount = Object.keys(rowSelection).length;

  const firstRow = pageIndex * pageSize + 1;
  const lastRow = Math.min((pageIndex + 1) * pageSize, totalRows);

  const rowHeightClass = DENSITY_ROW_HEIGHT[density];

  return (
    <div className="flex flex-col gap-0">
      {/* Bulk action strip */}
      {enableSelection && selectedCount > 0 && bulkActions && (
        <div className="flex items-center gap-3 px-4 py-2 bg-accent/5 border border-accent/20 rounded-t-md">
          <span className="text-sm font-medium text-ink-primary">
            {selectedCount} {selectedCount === 1 ? 'row' : 'rows'} selected
          </span>
          <div className="flex items-center gap-2 ml-2">{bulkActions}</div>
          <button
            type="button"
            onClick={() => table.resetRowSelection()}
            className="ml-auto text-xs text-ink-muted hover:text-ink-primary transition-colors"
          >
            Clear selection
          </button>
        </div>
      )}

      {/* Column config toolbar */}
      {enableColumnConfig && (
        <div className="flex justify-end px-2 py-1.5 border-b border-line">
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowColumnConfig((v) => !v)}
              aria-label="Configure columns"
              aria-expanded={showColumnConfig}
              className={cn(
                'inline-flex items-center gap-1.5 rounded px-2 py-1',
                'text-xs text-ink-secondary hover:text-ink-primary hover:bg-bg-subtle',
                'transition-colors focus-visible:outline-none',
                'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
              )}
            >
              <Settings2 className="h-3.5 w-3.5" aria-hidden="true" />
              Columns
            </button>

            {showColumnConfig && (
              <div className="absolute right-0 top-full z-20 mt-1 w-48 rounded-md border border-line bg-bg-canvas shadow-lg">
                <div className="p-2 space-y-1">
                  {table
                    .getAllLeafColumns()
                    .filter((col) => col.id !== '__select__')
                    .map((col) => (
                      <label
                        key={col.id}
                        className="flex items-center gap-2 px-2 py-1 rounded hover:bg-bg-subtle cursor-pointer text-sm text-ink-primary"
                      >
                        <input
                          type="checkbox"
                          checked={col.getIsVisible()}
                          onChange={col.getToggleVisibilityHandler()}
                          className="h-3.5 w-3.5 rounded border-line text-accent focus:ring-accent"
                        />
                        {typeof col.columnDef.header === 'string'
                          ? col.columnDef.header
                          : col.id}
                      </label>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-bg-canvas border-b border-line">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const sorted = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      className={cn(
                        'px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider',
                        'text-ink-muted whitespace-nowrap',
                        canSort && 'cursor-pointer select-none hover:text-ink-primary',
                      )}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      aria-sort={
                        sorted === 'asc'
                          ? 'ascending'
                          : sorted === 'desc'
                            ? 'descending'
                            : undefined
                      }
                    >
                      {header.isPlaceholder ? null : (
                        <span className="inline-flex items-center gap-1">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {canSort && <SortIcon sorted={sorted} />}
                        </span>
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={effectiveColumns.length}
                  className="px-4 py-16 text-center text-sm text-ink-muted"
                >
                  {emptyState ?? (
                    <span>No results found.</span>
                  )}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={cn(
                    rowHeightClass,
                    'border-b border-line transition-colors',
                    'even:bg-bg-subtle hover:bg-bg-hover',
                    onRowClick && 'cursor-pointer',
                    row.getIsSelected() && 'bg-accent/5',
                  )}
                  onClick={
                    onRowClick
                      ? () => onRowClick(row.original)
                      : undefined
                  }
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 text-sm text-ink-primary"
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination footer */}
      {totalRows > 0 && (
        <div className="flex items-center justify-between border-t border-line px-4 py-3 bg-bg-canvas">
          {/* Rows per page */}
          <div className="flex items-center gap-2 text-xs text-ink-secondary">
            <span>Rows per page:</span>
            <select
              value={pageSize}
              onChange={(e) => table.setPageSize(Number(e.target.value))}
              className={cn(
                'rounded border border-line bg-bg-canvas px-1.5 py-0.5',
                'text-xs text-ink-primary focus:outline-none focus:ring-2 focus:ring-accent',
              )}
              aria-label="Rows per page"
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          {/* Count + navigation */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-ink-secondary">
              Showing {firstRow}–{lastRow} of {totalRows}
            </span>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Previous page"
                className={cn(
                  'rounded p-1 text-ink-secondary hover:text-ink-primary hover:bg-bg-subtle',
                  'transition-colors focus-visible:outline-none',
                  'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                  'disabled:opacity-30 disabled:pointer-events-none',
                )}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              </button>

              <span className="min-w-[3rem] text-center text-xs text-ink-secondary">
                {pageIndex + 1} / {table.getPageCount()}
              </span>

              <button
                type="button"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Next page"
                className={cn(
                  'rounded p-1 text-ink-secondary hover:text-ink-primary hover:bg-bg-subtle',
                  'transition-colors focus-visible:outline-none',
                  'focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1',
                  'disabled:opacity-30 disabled:pointer-events-none',
                )}
              >
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
