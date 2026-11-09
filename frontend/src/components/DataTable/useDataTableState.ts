import { useCallback, useEffect, useRef, useState } from 'react';

import type { SortOrder } from '@/lib/crud';

/** Espera antes de enviar un filtro al servidor (requerimiento: 300 ms). */
const FILTER_DEBOUNCE_MS = 300;

export interface DataTableState {
  page: number;
  pageSize: number;
  sort?: string;
  order: SortOrder;
  /** Filtros ya aplicados (los que viajan al servidor, con debounce). */
  filters: Record<string, string>;
  /** Valores inmediatos de los inputs (para pintarlos sin esperar). */
  filterValues: Record<string, string>;
}

export interface DataTableStateApi extends DataTableState {
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  /** Orden por columna: asc → desc → sin orden. */
  toggleSort: (columnId: string) => void;
  /** Actualiza un filtro de inmediato y lo aplica al servidor tras 300 ms. */
  setFilterValue: (param: string, value: string) => void;
  clearFilters: () => void;
}

/**
 * Estado de paginación, orden y filtros de un DataTable server-side.
 * Los filtros viajan con debounce de 300 ms y siempre reinician la página a 1.
 */
export function useDataTableState(defaults?: {
  pageSize?: number;
  /** Orden inicial (para mostrarlo en la cabecera; el backend también aplica uno por defecto). */
  sort?: string;
  order?: SortOrder;
}): DataTableStateApi {
  const [state, setState] = useState<DataTableState>(() => ({
    page: 1,
    pageSize: defaults?.pageSize ?? 20,
    sort: defaults?.sort,
    order: defaults?.order ?? 'asc',
    filters: {},
    filterValues: {},
  }));
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Limpia el debounce pendiente al desmontar.
  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    [],
  );

  const setPage = useCallback((page: number) => {
    setState((current) => ({ ...current, page }));
  }, []);

  const setPageSize = useCallback((pageSize: number) => {
    setState((current) => ({ ...current, pageSize, page: 1 }));
  }, []);

  const toggleSort = useCallback((columnId: string) => {
    setState((current) => {
      if (current.sort !== columnId) {
        return { ...current, sort: columnId, order: 'asc' };
      }
      if (current.order === 'asc') {
        return { ...current, order: 'desc' };
      }
      return { ...current, sort: undefined, order: 'asc' };
    });
  }, []);

  const setFilterValue = useCallback((param: string, value: string) => {
    setState((current) => ({ ...current, filterValues: { ...current.filterValues, [param]: value } }));

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      // Aplica todos los filtros vigentes (no solo el último tecleado):
      // si el usuario escribió en dos campos seguidos, no se pierde el primero.
      setState((current) => ({ ...current, page: 1, filters: { ...current.filterValues } }));
      timerRef.current = null;
    }, FILTER_DEBOUNCE_MS);
  }, []);

  const clearFilters = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setState((current) => ({ ...current, page: 1, filters: {}, filterValues: {} }));
  }, []);

  return { ...state, setPage, setPageSize, toggleSort, setFilterValue, clearFilters };
}
