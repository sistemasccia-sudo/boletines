import type { Portada } from '@/features/portadas/api';
import type { PortadaInput } from '@/features/portadas/schema';
import { createCrudHooks } from '@/lib/crud';

/**
 * Hooks CRUD del recurso `/portadas`. Solo se usan listado, creación y
 * eliminación (la API no tiene actualización: es subir/listar/borrar imagen).
 */
const hooks = createCrudHooks<Portada, PortadaInput>('/portadas', 'portadas');

export const { useList: usePortadasList, useCreate: useCreatePortada, useDelete: useDeletePortada } =
  hooks;
