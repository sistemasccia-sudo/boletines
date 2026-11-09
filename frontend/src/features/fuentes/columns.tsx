import { Pencil, Trash2 } from 'lucide-react';

import type { DataTableColumn } from '@/components/DataTable/types';
import { Button } from '@/components/ui/button';
import type { Fuente } from '@/features/fuentes/api';

export interface FuenteRowHandlers {
  onEdit: (fuente: Fuente) => void;
  onDelete: (fuente: Fuente) => void;
}

/** Columnas de la tabla de fuentes (acciones inyectadas desde la página). */
export function createFuenteColumns({ onEdit, onDelete }: FuenteRowHandlers): DataTableColumn<Fuente>[] {
  return [
    {
      accessorKey: 'codigo',
      header: 'Código',
      filter: { type: 'text', placeholder: 'Ej. 5' },
    },
    {
      accessorKey: 'nombre',
      header: 'Nombre',
      filter: { type: 'text', placeholder: 'Buscar nombre' },
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
