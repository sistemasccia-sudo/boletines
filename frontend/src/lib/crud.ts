import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';

import { api } from '@/lib/api';

/** Meta de las respuestas paginadas del backend (formato AGENTS.md). */
export interface PaginatedMeta {
  page: number;
  pageSize: number;
  total: number;
}

/** Respuesta estándar de cualquier listado: `{ data, meta }`. */
export interface Paginated<T> {
  data: T[];
  meta: PaginatedMeta;
}

export type SortOrder = 'asc' | 'desc';

/** Parámetros estándar de listado (paginación, orden y filtros en el servidor). */
export interface ListParams {
  page: number;
  pageSize: number;
  sort?: string;
  order?: SortOrder;
  /** Un filtro por campo, p. ej. `{ codigo: '571', fecha_desde: '2026-01-01' }`. */
  filters?: Record<string, string>;
}

/**
 * Construye los query params de un listado:
 * - `page`/`pageSize` siempre;
 * - `sort`/`order` solo si hay campo de orden (con `asc` por defecto);
 * - filtros sin valor en blanco se descartan.
 */
export function buildListParams(params: ListParams): Record<string, string | number> {
  const query: Record<string, string | number> = {
    page: params.page,
    pageSize: params.pageSize,
  };

  if (params.sort) {
    query.sort = params.sort;
    query.order = params.order ?? 'asc';
  }

  for (const [field, value] of Object.entries(params.filters ?? {})) {
    const trimmed = value.trim();
    if (trimmed !== '') {
      query[field] = trimmed;
    }
  }

  return query;
}

/** Hooks CRUD genéricos para un recurso REST (`{resource}`, `{resource}/{id}`). */
export interface CrudHooks<TRecord, TInput> {
  /** Listado paginado con `keepPreviousData` para paginar sin parpadeos. */
  useList: (params: ListParams) => UseQueryResult<Paginated<TRecord>, Error>;
  /** Detalle completo de un registro (campos que el listado no trae, p. ej. `cuerpo`). */
  useGet: (id: string | number, options?: { enabled?: boolean }) => UseQueryResult<TRecord, Error>;
  /** Crea un registro y invalida el listado del recurso. */
  useCreate: () => UseMutationResult<TRecord, Error, TInput>;
  /** Actualiza un registro (PATCH con campos parciales) y invalida el listado. */
  useUpdate: () => UseMutationResult<TRecord, Error, { id: string | number; input: Partial<TInput> }>;
  /** Elimina un registro y invalida el listado. */
  useDelete: () => UseMutationResult<void, Error, string | number>;
}

/**
 * Fábrica de hooks de React Query para un recurso.
 * Cada feature la usa para no duplicar código de listado/crear/editar/eliminar:
 *
 * ```ts
 * export const cartasHooks = createCrudHooks<Carta, CartaInput>('/cartas', 'cartas');
 * const { useList, useCreate } = cartasHooks;
 * ```
 *
 * @param resource Ruta del recurso, p. ej. `/cartas`.
 * @param queryKey Clave base de React Query, p. ej. `cartas`.
 */
export function createCrudHooks<TRecord, TInput>(resource: string, queryKey: string): CrudHooks<TRecord, TInput> {
  const baseKey: QueryKey = [queryKey];

  function useList(params: ListParams): UseQueryResult<Paginated<TRecord>, Error> {
    return useQuery({
      queryKey: [...baseKey, 'list', params],
      queryFn: async () => {
        const response = await api.get<Paginated<TRecord>>(resource, {
          params: buildListParams(params),
        });
        return response.data;
      },
      placeholderData: keepPreviousData,
    });
  }

  function useGet(id: string | number, options?: { enabled?: boolean }): UseQueryResult<TRecord, Error> {
    return useQuery({
      queryKey: [...baseKey, 'detail', id],
      queryFn: async () => (await api.get<TRecord>(`${resource}/${encodeURIComponent(String(id))}`)).data,
      enabled: options?.enabled ?? true,
    });
  }

  function useCreate(): UseMutationResult<TRecord, Error, TInput> {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (input: TInput) => (await api.post<TRecord>(resource, input)).data,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: baseKey }),
    });
  }

  function useUpdate(): UseMutationResult<TRecord, Error, { id: string | number; input: Partial<TInput> }> {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async ({ id, input }: { id: string | number; input: Partial<TInput> }) =>
        (await api.patch<TRecord>(`${resource}/${encodeURIComponent(String(id))}`, input)).data,
      onSuccess: () => queryClient.invalidateQueries({ queryKey: baseKey }),
    });
  }

  function useDelete(): UseMutationResult<void, Error, string | number> {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: async (id: string | number) => {
        await api.delete(`${resource}/${encodeURIComponent(String(id))}`);
      },
      onSuccess: () => queryClient.invalidateQueries({ queryKey: baseKey }),
    });
  }

  return { useList, useGet, useCreate, useUpdate, useDelete };
}
