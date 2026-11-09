import type { TipoCambio } from '@/features/tipo-cambio/api';
import type { TipoCambioInput } from '@/features/tipo-cambio/schema';
import { createCrudHooks } from '@/lib/crud';

/** Hooks CRUD del recurso `/tipo-cambio`. */
const hooks = createCrudHooks<TipoCambio, TipoCambioInput>('/tipo-cambio', 'tipo-cambio');

export const {
  useList: useTiposCambioList,
  useCreate: useCreateTipoCambio,
  useUpdate: useUpdateTipoCambio,
  useDelete: useDeleteTipoCambio,
} = hooks;
