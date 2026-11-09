import { Pencil, Trash2 } from 'lucide-react';

import type { DataTableColumn } from '@/components/DataTable/types';
import { Button } from '@/components/ui/button';
import type { Noticia } from '@/features/noticias/api';
import { TIPOS_NOTICIA } from '@/features/noticias/schema';

export interface NoticiaRowHandlers {
  onEdit: (noticia: Noticia) => void;
  onDelete: (noticia: Noticia) => void;
}

/** Columnas de la tabla de noticias (acciones inyectadas desde la página). */
export function createNoticiaColumns(
  { onEdit, onDelete }: NoticiaRowHandlers,
  fuenteOptions: ReadonlyArray<{ value: string; label: string }> = [],
): DataTableColumn<Noticia>[] {
  return [
    {
      accessorKey: 'fecha',
      header: 'Fecha',
      filter: { type: 'dateRange' },
    },
    {
      accessorKey: 'titulo',
      header: 'Título',
      filter: { type: 'text', placeholder: 'Buscar título' },
      cell: ({ row }) => (
        <div className="max-w-md">
          <p className="font-medium">{row.original.titulo}</p>
          {row.original.bajada ? (
            <p className="line-clamp-1 text-xs text-muted-foreground">{row.original.bajada}</p>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: 'tipo',
      header: 'Tipo',
      filter: { type: 'select', options: TIPOS_NOTICIA },
      cell: ({ row }) =>
        TIPOS_NOTICIA.find((tipo) => tipo.value === row.original.tipo)?.label ?? '—',
    },
    {
      id: 'fuente',
      header: 'Fuente',
      sortable: false,
      filter: { type: 'select', options: fuenteOptions, param: 'fuente' },
      cell: ({ row }) => row.original.fuente_nombre ?? '—',
    },
    {
      id: 'mostrar_en_web',
      header: 'En web',
      sortable: false,
      cell: ({ row }) =>
        row.original.mostrar_en_web ? (
          <span className="inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            Sí
          </span>
        ) : (
          <span className="inline-flex rounded-full border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            No
          </span>
        ),
    },
    {
      id: 'imagen',
      header: 'Imagen',
      sortable: false,
      cell: ({ row }) => {
        const src = row.original.imagen_thumb ?? row.original.imagen;
        return src ? (
          <img
            src={src}
            alt=""
            loading="lazy"
            className="h-10 w-14 rounded border object-cover"
          />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        );
      },
    },
    {
      id: 'acciones',
      header: 'Acciones',
      sortable: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => onEdit(row.original)}
            aria-label={`Editar ${row.original.titulo}`}
            title="Editar"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(row.original)}
            aria-label={`Eliminar ${row.original.titulo}`}
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}
