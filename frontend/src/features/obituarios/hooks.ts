import type { Obituario } from '@/features/obituarios/api';
import type { ObituarioInput } from '@/features/obituarios/schema';
import { createCrudHooks } from '@/lib/crud';

/** Hooks CRUD del recurso `/obituarios`. */
const hooks = createCrudHooks<Obituario, ObituarioInput>('/obituarios', 'obituarios');

export const {
  useList: useObituariosList,
  useCreate: useCreateObituario,
  useUpdate: useUpdateObituario,
  useDelete: useDeleteObituario,
} = hooks;
