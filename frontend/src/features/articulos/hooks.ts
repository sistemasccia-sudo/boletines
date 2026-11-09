import type { Articulo } from '@/features/articulos/api';
import type { ArticuloInput } from '@/features/articulos/schema';
import { createCrudHooks } from '@/lib/crud';

/** Hooks CRUD del recurso `/articulos` (incluye `useGet` para el detalle con cuerpo). */
const hooks = createCrudHooks<Articulo, ArticuloInput>('/articulos', 'articulos');

export const {
  useList: useArticulosList,
  useGet: useArticuloDetalle,
  useCreate: useCreateArticulo,
  useUpdate: useUpdateArticulo,
  useDelete: useDeleteArticulo,
} = hooks;
