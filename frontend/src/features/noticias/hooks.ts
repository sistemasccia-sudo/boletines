import type { Noticia } from '@/features/noticias/api';
import type { NoticiaInput } from '@/features/noticias/schema';
import { createCrudHooks } from '@/lib/crud';

/** Hooks CRUD del recurso `/noticias` (incluye `useGet` para el detalle con cuerpo). */
const hooks = createCrudHooks<Noticia, NoticiaInput>('/noticias', 'noticias');

export const {
  useList: useNoticiasList,
  useGet: useNoticiaDetalle,
  useCreate: useCreateNoticia,
  useUpdate: useUpdateNoticia,
  useDelete: useDeleteNoticia,
} = hooks;
