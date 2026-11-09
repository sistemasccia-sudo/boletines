import { Pencil, Trash2 } from 'lucide-react';

import type { DataTableColumn } from '@/components/DataTable/types';
import { Button } from '@/components/ui/button';
import type { Articulo } from '@/features/articulos/api';

export interface ArticuloRowHandlers {
  onEdit: (articulo: Articulo) => void;
  onDelete: (articulo: Articulo) => void;
}

/** Columnas de la tabla de artículos (acciones inyectadas desde la página). */
export function createArticuloColumns({
  onEdit,
  onDelete,
}: ArticuloRowHandlers): DataTableColumn<Articulo>[] {
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
