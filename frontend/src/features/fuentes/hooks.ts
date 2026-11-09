import type { Fuente } from '@/features/fuentes/api';
import type { FuenteInput } from '@/features/fuentes/schema';
import { createCrudHooks } from '@/lib/crud';

/** Hooks CRUD del recurso `/fuentes` (patrón de `createCrudHooks`). */
const hooks = createCrudHooks<Fuente, FuenteInput>('/fuentes', 'fuentes');

export const {
  useList: useFuentesList,
  useCreate: useCreateFuente,
  useUpdate: useUpdateFuente,
  useDelete: useDeleteFuente,
} = hooks;
