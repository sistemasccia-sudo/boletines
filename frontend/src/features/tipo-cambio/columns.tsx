import { Pencil, Trash2 } from 'lucide-react';

import type { DataTableColumn } from '@/components/DataTable/types';
import { Button } from '@/components/ui/button';
import type { TipoCambio } from '@/features/tipo-cambio/api';

export interface TipoCambioRowHandlers {
  onEdit: (registro: TipoCambio) => void;
  onDelete: (registro: TipoCambio) => void;
}

/**
 * Columnas de la tabla de tipo de cambio: cada campo se guarda por separado
 * (fuente en su columna; compra/venta con el monto en VARCHAR).
 */
export function createTipoCambioColumns({
  onEdit,
  onDelete,
}: TipoCambioRowHandlers): DataTableColumn<TipoCambio>[] {
  return [
    {
      accessorKey: 'fecha',
      header: 'Fecha',
      filter: { type: 'dateRange' },
    },
    {
      accessorKey: 'fuente',
      header: 'Fuente',
    },
    {
      accessorKey: 'compra',
      header: 'Compra',
    },
    {
      accessorKey: 'venta',
      header: 'Venta',
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
            aria-label={`Editar tipo de cambio del ${row.original.fecha}`}
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
            aria-label={`Eliminar tipo de cambio del ${row.original.fecha}`}
            title="Eliminar"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];
}
