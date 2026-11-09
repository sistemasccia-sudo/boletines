import type { Legal } from '@/features/legal/api';
import type { LegalInput } from '@/features/legal/schema';
import { createCrudHooks } from '@/lib/crud';

/** Hooks CRUD del recurso `/legal`. */
const hooks = createCrudHooks<Legal, LegalInput>('/legal', 'legal');

export const {
  useList: useLegalesList,
  useGet: useLegalDetalle,
  useCreate: useCreateLegal,
  useUpdate: useUpdateLegal,
  useDelete: useDeleteLegal,
} = hooks;
