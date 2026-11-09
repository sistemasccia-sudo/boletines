import { Pencil, Trash2 } from 'lucide-react';

import type { DataTableColumn } from '@/components/DataTable/types';
import { Button } from '@/components/ui/button';
import type { Legal } from '@/features/legal/api';

export interface LegalRowHandlers {
  onEdit: (norma: Legal) => void;
  onDelete: (norma: Legal) => void;
}

/** Columnas de la tabla de Bol. Legal (sin `cuerpo`: el listado no lo trae). */
export function createLegalColumns({
  onEdit,
  onDelete,
}: LegalRowHandlers): DataTableColumn<Legal>[] {
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
    },
    {
      accessorKey: 'norma_legal',
      header: 'Norma legal',
      sortable: false,
      filter: { type: 'text', placeholder: 'Buscar norma legal' },
      cell: ({ row }) => (
        <p className="line-clamp-2 max-w-md text-sm text-muted-foreground">
          {row.original.norma_legal ?? '—'}
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
            aria-label={`Editar norma legal «${row.original.titulo}»`}
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
            aria-label={`Eliminar norma legal «${row.original.titulo}»`}
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}
