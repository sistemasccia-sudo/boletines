import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Loader2, X } from 'lucide-react';

import type { DataTableColumn, DataTableColumnExtras, DataTableFilterConfig } from '@/components/DataTable/types';
import type { DataTableStateApi } from '@/components/DataTable/useDataTableState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import type { PaginatedMeta } from '@/lib/crud';
import type { ReactNode } from 'react';

interface DataTableProps<TData> {
  columns: DataTableColumn<TData>[];
  data: TData[];
  /** Meta del servidor (`{ page, pageSize, total }`); undefined en la primera carga. */
  meta?: PaginatedMeta;
  state: DataTableStateApi;
  /** Primera carga (sin datos): muestra skeletons. */
  isLoading?: boolean;
  /** Refetch con datos en pantalla (p. ej. al paginar). */
  isFetching?: boolean;
  /** Mensaje de error ya formateado (p. ej. `getApiErrorMessage`). */
  error?: string | null;
  onRetry?: () => void;
  emptyMessage?: string;
  /** Botones a la derecha de la barra de filtros (p. ej. "Nuevo registro"). */
  toolbarActions?: ReactNode;
  getRowId?: (row: TData) => string;
}

/** Clave de la columna (`id` o `accessorKey`): es también el parámetro de la API. */
function columnKey<TData>(column: DataTableColumn<TData>): string | undefined {
  const raw = column as { id?: string; accessorKey?: string };
  if (typeof raw.id === 'string' && raw.id !== '') {
    return raw.id;
  }
  if (typeof raw.accessorKey === 'string' && raw.accessorKey !== '') {
    return raw.accessorKey;
  }
  return undefined;
}

interface ResolvedFilter<TData> {
  column: DataTableColumn<TData>;
  config: DataTableFilterConfig;
  param: string;
  label: string;
}

function resolveFilters<TData>(columns: DataTableColumn<TData>[]): ResolvedFilter<TData>[] {
  const resolved: ResolvedFilter<TData>[] = [];

  for (const column of columns) {
    const extras: DataTableColumnExtras = column;
    const config = extras.filter;
    if (!config) {
      continue;
    }
    const key = columnKey(column);
    const param = config.param ?? key;
    if (!param) {
      continue;
    }
    resolved.push({
      column,
      config,
      param,
      label: typeof column.header === 'string' ? column.header : param,
    });
  }

  return resolved;
}

/**
 * DataTable genérico server-side: la paginación, el orden y los filtros se
 * resuelven en el servidor (contrato `{ data, meta }` de AGENTS.md).
 * El estado vive en `useDataTableState`; aquí solo se pinta.
 */
export function DataTable<TData>({
  columns,
  data,
  meta,
  state,
  isLoading = false,
  isFetching = false,
  error = null,
  onRetry,
  emptyMessage = 'No se encontraron registros.',
  toolbarActions,
  getRowId,
}: DataTableProps<TData>) {
  const sorting: SortingState = state.sort ? [{ id: state.sort, desc: state.order === 'desc' }] : [];

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    manualSorting: true,
    manualFiltering: true,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getRowId: getRowId ? (row: TData) => getRowId(row) : undefined,
  });

  const filters = resolveFilters(columns);
  const hasActiveFilters = Object.values(state.filterValues).some((value) => value !== '');

  const pageSize = meta?.pageSize ?? state.pageSize;
  const total = meta?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const firstRow = total === 0 ? 0 : (state.page - 1) * pageSize + 1;
  const lastRow = Math.min(state.page * pageSize, total);
  const columnCount = table.getAllLeafColumns().length;
  const skeletonRowCount = Math.min(pageSize, 10);

  const renderFilterControl = ({ config, param, label }: ResolvedFilter<TData>) => {
    const value = state.filterValues[param] ?? '';

    if (config.type === 'select') {
      return (
        <Select
          key={param}
          value={value}
          onChange={(event) => state.setFilterValue(param, event.target.value)}
          aria-label={`Filtrar por ${label}`}
          className="h-9 w-44"
        >
          <option value="">Todos</option>
          {config.options?.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      );
    }

    if (config.type === 'dateRange') {
      const desdeParam = `${param}_desde`;
      const hastaParam = `${param}_hasta`;

      return (
        <div key={param} className="flex items-center gap-1" role="group" aria-label={`Rango de ${label.toLowerCase()}`}>
          <Input
            type="date"
            value={state.filterValues[desdeParam] ?? ''}
            onChange={(event) => state.setFilterValue(desdeParam, event.target.value)}
            aria-label={`${label}: desde`}
            className="h-9 w-36"
          />
          <span aria-hidden="true" className="text-xs text-muted-foreground">
            –
          </span>
          <Input
            type="date"
            value={state.filterValues[hastaParam] ?? ''}
            onChange={(event) => state.setFilterValue(hastaParam, event.target.value)}
            aria-label={`${label}: hasta`}
            className="h-9 w-36"
          />
        </div>
      );
    }

    return (
      <Input
        key={param}
        type={config.type === 'date' ? 'date' : 'search'}
        value={value}
        onChange={(event) => state.setFilterValue(param, event.target.value)}
        placeholder={config.placeholder ?? (config.type === 'date' ? undefined : `Filtrar ${label.toLowerCase()}`)}
        aria-label={`Filtrar por ${label}`}
        className="h-9 w-52"
      />
    );
  };

  return (
    <div className="space-y-3">
      {(filters.length > 0 || toolbarActions) && (
        <div className="flex flex-wrap items-center gap-2">
          {filters.map(renderFilterControl)}

          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={state.clearFilters}>
              <X className="h-4 w-4" />
              Limpiar filtros
            </Button>
          )}

          {toolbarActions && <div className="ml-auto flex items-center gap-2">{toolbarActions}</div>}
        </div>
      )}

      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" aria-busy={isLoading || isFetching}>
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b bg-muted/50">
                  {headerGroup.headers.map((header) => {
                    const extras: DataTableColumnExtras = header.column.columnDef as DataTableColumn<TData>;
                    const key = columnKey(header.column.columnDef as DataTableColumn<TData>);
                    const sortable = extras.sortable !== false && key !== undefined;
                    const isActive = key !== undefined && state.sort === key;

                    const content = flexRender(header.column.columnDef.header, header.getContext());
                    const indicator = !sortable ? null : isActive ? (
                      state.order === 'asc' ? (
                        <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                      ) : (
                        <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                      )
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden="true" />
                    );

                    return (
                      <th
                        key={header.id}
                        scope="col"
                        aria-sort={isActive ? (state.order === 'asc' ? 'ascending' : 'descending') : 'none'}
                        className="h-10 whitespace-nowrap px-3 text-left align-middle font-medium text-muted-foreground"
                      >
                        {sortable && key ? (
                          <button
                            type="button"
                            onClick={() => state.toggleSort(key)}
                            className="inline-flex items-center gap-1.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            title={`Ordenar por ${typeof header.column.columnDef.header === 'string' ? header.column.columnDef.header : key}`}
                          >
                            {content}
                            {indicator}
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1.5">
                            {content}
                            {indicator}
                          </span>
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            <tbody>
              {isLoading ? (
                Array.from({ length: skeletonRowCount }, (_, rowIndex) => (
                  <tr key={`skeleton-${rowIndex}`} className="border-b">
                    {Array.from({ length: columnCount }, (_, cellIndex) => (
                      <td key={`skeleton-${rowIndex}-${cellIndex}`} className="px-3 py-2.5">
                        <Skeleton className="h-5 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : error ? (
                <tr className="border-b">
                  <td colSpan={columnCount} className="px-3 py-8 text-center">
                    <p className="text-sm text-destructive">{error}</p>
                    {onRetry && (
                      <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
                        Reintentar
                      </Button>
                    )}
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr className="border-b">
                  <td colSpan={columnCount} className="px-3 py-8 text-center text-muted-foreground">
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-b transition-colors hover:bg-muted/40">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-3 py-2.5 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t px-3 py-2.5 text-sm text-muted-foreground">
          <p aria-live="polite">
            {total === 0 ? 'Sin registros' : `Mostrando ${firstRow}–${lastRow} de ${total}`}
          </p>

          <div className="flex items-center gap-2">
            {isFetching && !isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-label="Actualizando" />}
            <span>
              Página {state.page} de {pageCount}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => state.setPage(state.page - 1)}
              disabled={state.page <= 1 || isLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => state.setPage(state.page + 1)}
              disabled={state.page >= pageCount || isLoading}
            >
              Siguiente
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
