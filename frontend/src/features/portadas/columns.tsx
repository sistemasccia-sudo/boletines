import { Trash2 } from 'lucide-react';

import type { DataTableColumn } from '@/components/DataTable/types';
import { Button } from '@/components/ui/button';
import type { Portada } from '@/features/portadas/api';

export interface PortadaRowHandlers {
  onDelete: (portada: Portada) => void;
}

/** Columnas de la tabla de portadas (solo vista previa y eliminar). */
export function createPortadaColumns({ onDelete }: PortadaRowHandlers): DataTableColumn<Portada>[] {
  return [
    {
      accessorKey: 'fecha',
      header: 'Fecha',
      filter: { type: 'dateRange' },
    },
    {
      id: 'archivo',
      header: 'Portada',
      sortable: false,
      cell: ({ row }) => {
        const src = row.original.archivo_thumb ?? row.original.archivo;
        return src ? (
          <img
            src={src}
            alt={`Portada del ${row.original.fecha}`}
            loading="lazy"
            className="h-14 w-24 rounded border object-cover"
          />
        ) : (
          <span className="text-xs text-muted-foreground">Sin imagen</span>
        );
      },
    },
    {
      id: 'acciones',
      header: 'Acciones',
      sortable: false,
      cell: ({ row }) => (
        <div className="flex items-center justify-end">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(row.original)}
            aria-label={`Eliminar portada del ${row.original.fecha}`}
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}
