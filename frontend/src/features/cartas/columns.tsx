import { Pencil, Trash2 } from 'lucide-react';

import type { DataTableColumn } from '@/components/DataTable/types';
import { Button } from '@/components/ui/button';
import type { Carta } from '@/features/cartas/api';

export interface CartaRowHandlers {
  onEdit: (carta: Carta) => void;
  onDelete: (carta: Carta) => void;
}

/**
 * Columnas de la tabla de Cartas: un filtro de búsqueda por cada columna
 * (código, remitente, destinatario y asunto) + rango de fechas.
 */
export function createCartaColumns({
  onEdit,
  onDelete,
}: CartaRowHandlers): DataTableColumn<Carta>[] {
  return [
    {
      accessorKey: 'codigo',
      header: 'Código',
      filter: { type: 'text', placeholder: '571-2026' },
    },
    {
      accessorKey: 'remitente',
      header: 'Remitente',
      filter: { type: 'text', placeholder: 'Buscar remitente' },
    },
    {
      accessorKey: 'destinatario',
      header: 'Destinatario',
      filter: { type: 'text', placeholder: 'Buscar destinatario' },
    },
    {
      accessorKey: 'asunto',
      header: 'Asunto',
      sortable: false,
      filter: { type: 'text', placeholder: 'Buscar asunto' },
      cell: ({ row }) => (
        <p className="line-clamp-2 max-w-md text-sm text-muted-foreground">
          {row.original.asunto}
        </p>
      ),
    },
    {
      accessorKey: 'fecha',
      header: 'Fecha',
      filter: { type: 'dateRange' },
    },
    {
      accessorKey: 'usuario',
      header: 'Usuario',
      sortable: false,
      cell: ({ row }) => row.original.usuario || '—',
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
            aria-label={`Editar carta ${row.original.codigo}`}
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
            aria-label={`Eliminar carta ${row.original.codigo}`}
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}
