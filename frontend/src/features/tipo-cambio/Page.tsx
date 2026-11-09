import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/crud/ConfirmDialog';
import { DataTable } from '@/components/DataTable/DataTable';
import { useDataTableState } from '@/components/DataTable/useDataTableState';
import { Button } from '@/components/ui/button';
import type { TipoCambio } from '@/features/tipo-cambio/api';
import { createTipoCambioColumns } from '@/features/tipo-cambio/columns';
import { TipoCambioForm } from '@/features/tipo-cambio/Form';
import { useDeleteTipoCambio, useTiposCambioList } from '@/features/tipo-cambio/hooks';
import { getApiErrorMessage } from '@/lib/api';

/** Pestaña «Tipo de cambio» del módulo Bol. Noticias. */
export default function TipoCambioPage() {
  const tableState = useDataTableState({ pageSize: 20, sort: 'fecha', order: 'desc' });
  const { page, pageSize, sort, order, filters } = tableState;

  const listQuery = useTiposCambioList({ page, pageSize, sort, order, filters });
  const deleteMutation = useDeleteTipoCambio();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<TipoCambio | null>(null);
  const [deleting, setDeleting] = useState<TipoCambio | null>(null);

  const columns = createTipoCambioColumns({
    onEdit: (registro) => {
      setEditing(registro);
      setIsFormOpen(true);
    },
    onDelete: (registro) => setDeleting(registro),
  });

  const handleConfirmDelete = async () => {
    if (!deleting) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success('Tipo de cambio eliminado correctamente.');
      setDeleting(null);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    }
  };

  return (
    <div className="space-y-4">
      <DataTable
        columns={columns}
        data={listQuery.data?.data ?? []}
        meta={listQuery.data?.meta}
        state={tableState}
        isLoading={listQuery.isLoading}
        isFetching={listQuery.isFetching}
        error={listQuery.error ? getApiErrorMessage(listQuery.error) : null}
        onRetry={() => listQuery.refetch()}
        emptyMessage="No hay tipos de cambio registrados."
        toolbarActions={
          <Button
            type="button"
            onClick={() => {
              setEditing(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo tipo de cambio
          </Button>
        }
      />

      {isFormOpen && <TipoCambioForm record={editing} onClose={() => setIsFormOpen(false)} />}

      <ConfirmDialog
        open={deleting != null}
        title="Eliminar tipo de cambio"
        description={
          deleting
            ? `Se eliminará el registro de ${deleting.fuente || 'sin fuente'} del ${deleting.fecha}.`
            : undefined
        }
        isPending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
