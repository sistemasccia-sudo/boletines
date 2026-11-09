import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/crud/ConfirmDialog';
import { DataTable } from '@/components/DataTable/DataTable';
import { useDataTableState } from '@/components/DataTable/useDataTableState';
import { Button } from '@/components/ui/button';
import type { Portada } from '@/features/portadas/api';
import { createPortadaColumns } from '@/features/portadas/columns';
import { PortadaForm } from '@/features/portadas/Form';
import { useDeletePortada, usePortadasList } from '@/features/portadas/hooks';
import { getApiErrorMessage } from '@/lib/api';

/** Pestaña «Portadas» del módulo Bol. Noticias. */
export default function PortadasPage() {
  const tableState = useDataTableState({ pageSize: 20, sort: 'fecha', order: 'desc' });
  const { page, pageSize, sort, order, filters } = tableState;

  const listQuery = usePortadasList({ page, pageSize, sort, order, filters });
  const deleteMutation = useDeletePortada();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deleting, setDeleting] = useState<Portada | null>(null);

  const columns = createPortadaColumns({
    onDelete: (portada) => setDeleting(portada),
  });

  const handleConfirmDelete = async () => {
    if (!deleting) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success('Portada eliminada correctamente.');
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
        emptyMessage="No hay portadas registradas."
        toolbarActions={
          <Button type="button" onClick={() => setIsFormOpen(true)}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva portada
          </Button>
        }
      />

      {isFormOpen && <PortadaForm onClose={() => setIsFormOpen(false)} />}

      <ConfirmDialog
        open={deleting != null}
        title="Eliminar portada"
        description={
          deleting ? `Se eliminará la portada del ${deleting.fecha} (imagen y miniatura).` : undefined
        }
        isPending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
