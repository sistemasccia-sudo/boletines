import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/crud/ConfirmDialog';
import { DataTable } from '@/components/DataTable/DataTable';
import { useDataTableState } from '@/components/DataTable/useDataTableState';
import { Button } from '@/components/ui/button';
import type { Obituario } from '@/features/obituarios/api';
import { createObituarioColumns } from '@/features/obituarios/columns';
import { ObituarioForm } from '@/features/obituarios/Form';
import { useDeleteObituario, useObituariosList } from '@/features/obituarios/hooks';
import { getApiErrorMessage } from '@/lib/api';

/** Pestaña «Obituarios» del módulo Bol. Noticias. */
export default function ObituariosPage() {
  const tableState = useDataTableState({ pageSize: 20, sort: 'fecha', order: 'desc' });
  const { page, pageSize, sort, order, filters } = tableState;

  const listQuery = useObituariosList({ page, pageSize, sort, order, filters });
  const deleteMutation = useDeleteObituario();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Obituario | null>(null);
  const [deleting, setDeleting] = useState<Obituario | null>(null);

  const columns = createObituarioColumns({
    onEdit: (obituario) => {
      setEditing(obituario);
      setIsFormOpen(true);
    },
    onDelete: (obituario) => setDeleting(obituario),
  });

  const handleConfirmDelete = async () => {
    if (!deleting) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success('Obituario eliminado correctamente.');
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
        emptyMessage="No hay obituarios registrados."
        toolbarActions={
          <Button
            type="button"
            onClick={() => {
              setEditing(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo obituario
          </Button>
        }
      />

      {isFormOpen && <ObituarioForm record={editing} onClose={() => setIsFormOpen(false)} />}

      <ConfirmDialog
        open={deleting != null}
        title="Eliminar obituario"
        description={
          deleting ? `Se eliminará el obituario de «${deleting.nombre}».` : undefined
        }
        isPending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
