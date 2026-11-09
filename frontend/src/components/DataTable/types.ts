import type { ColumnDef } from '@tanstack/react-table';

export type DataTableFilterType = 'text' | 'select' | 'date' | 'dateRange';

export interface DataTableFilterConfig {
  type: DataTableFilterType;
  /** Query param del filtro (por defecto, el id de la columna). */
  param?: string;
  placeholder?: string;
  /** Opciones del filtro de tipo `select`. */
  options?: ReadonlyArray<{ value: string; label: string }>;
  /**
   * Para `dateRange`: envía dos params `<param>_desde` y `<param>_hasta`
   * (p. ej. columna `fecha` → `fecha_desde`/`fecha_hasta`).
   */
}

/**
 * Extras de columna sobre `ColumnDef` de TanStack Table:
 * - `filter`: filtro de servidor que se muestra en la barra superior;
 * - `sortable`: orden habilitado (por defecto `true` cuando la columna tiene clave).
 *
 * La clave de la columna (`id` o `accessorKey`) es también el nombre del
 * campo de orden/filtro en la API (p. ej. `codigo`, `fecha`).
 */
export interface DataTableColumnExtras {
  filter?: DataTableFilterConfig;
  sortable?: boolean;
}

export type DataTableColumn<TData> = ColumnDef<TData> & DataTableColumnExtras;
