import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { OrdenDelDia } from '@/features/orden-noticias/api';
import { api } from '@/lib/api';

/**
 * Clave por tipo de noticia: empieza por `noticias` para que las
 * invalidaciones del CRUD de noticias también refresquen esta lista.
 */
const ordenKey = (tipo: string) => ['noticias', 'orden', tipo] as const;

/** Lista de las noticias de hoy (America/Lima) filtradas por tipo (1..4). */
export function useOrdenDelDia(tipo: string) {
  return useQuery({
    queryKey: ordenKey(tipo),
    queryFn: async () =>
      (await api.get<OrdenDelDia>('/noticias/orden', { params: { tipo } })).data,
  });
}

/** Intercambia la posición de dos noticias del día y actualiza la lista filtrada. */
export function useIntercambiarOrden(tipo: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (ids: [number, number]) =>
      (
        await api.post<OrdenDelDia>(
          '/noticias/orden/intercambiar',
          { ids },
          { params: { tipo } },
        )
      ).data,
    // El backend devuelve la lista actualizada (con el mismo filtro): se usa tal cual.
    onSuccess: (data) => {
      queryClient.setQueryData(ordenKey(tipo), data);
    },
  });
}
