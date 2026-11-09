import type { Carta } from '@/features/cartas/api';
import type { CartaInput } from '@/features/cartas/schema';
import { createCrudHooks } from '@/lib/crud';

/** Hooks CRUD del recurso `/cartas`. */
const hooks = createCrudHooks<Carta, CartaInput>('/cartas', 'cartas');

export const {
  useList: useCartasList,
  useCreate: useCreateCarta,
  useUpdate: useUpdateCarta,
  useDelete: useDeleteCarta,
} = hooks;
