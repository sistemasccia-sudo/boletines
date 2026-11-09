import { Pencil, Trash2 } from 'lucide-react';

import type { DataTableColumn } from '@/components/DataTable/types';
import { Button } from '@/components/ui/button';
import type { Obituario } from '@/features/obituarios/api';

export interface ObituarioRowHandlers {
  onEdit: (obituario: Obituario) => void;
  onDelete: (obituario: Obituario) => void;
}

/** Columnas de la tabla de obituarios. */
export function createObituarioColumns({
  onEdit,
  onDelete,
}: ObituarioRowHandlers): DataTableColumn<Obituario>[] {
  return [
    {
      accessorKey: 'fecha',
      header: 'Fecha',
      filter: { type: 'dateRange' },
    },
    {
      accessorKey: 'nombre',
      header: 'Nombre',
      filter: { type: 'text', placeholder: 'Buscar nombre' },
    },
    {
      accessorKey: 'descripcion',
      header: 'Descripción',
      sortable: false,
      filter: { type: 'text', placeholder: 'Buscar descripción' },
      cell: ({ row }) => (
        <p className="line-clamp-2 max-w-md text-sm text-muted-foreground">
          {row.original.descripcion}
        </p>
      ),
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
            aria-label={`Editar ${row.original.nombre}`}
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
            aria-label={`Eliminar ${row.original.nombre}`}
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}
