import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/crud/ConfirmDialog';
import { DataTable } from '@/components/DataTable/DataTable';
import { useDataTableState } from '@/components/DataTable/useDataTableState';
import { Button } from '@/components/ui/button';
import type { Legal } from '@/features/legal/api';
import { createLegalColumns } from '@/features/legal/columns';
import { LegalForm } from '@/features/legal/Form';
import { useDeleteLegal, useLegalesList } from '@/features/legal/hooks';
import { getApiErrorMessage } from '@/lib/api';

/** Página del módulo Bol. Legal (sección única). */
export default function LegalPage() {
  const tableState = useDataTableState({ pageSize: 20, sort: 'fecha', order: 'desc' });
  const { page, pageSize, sort, order, filters } = tableState;

  const listQuery = useLegalesList({ page, pageSize, sort, order, filters });
  const deleteMutation = useDeleteLegal();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Legal | null>(null);
  const [deleting, setDeleting] = useState<Legal | null>(null);

  const columns = createLegalColumns({
    onEdit: (norma) => {
      setEditing(norma);
      setIsFormOpen(true);
    },
    onDelete: (norma) => setDeleting(norma),
  });

  const handleConfirmDelete = async () => {
    if (!deleting) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success('Norma legal eliminada correctamente.');
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
        emptyMessage="No hay normas legales registradas."
        toolbarActions={
          <Button
            type="button"
            onClick={() => {
              setEditing(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva norma legal
          </Button>
        }
      />

      {isFormOpen && <LegalForm record={editing} onClose={() => setIsFormOpen(false)} />}

      <ConfirmDialog
        open={deleting != null}
        title="Eliminar norma legal"
        description={
          deleting ? `Se eliminará la norma legal «${deleting.titulo}».` : undefined
        }
        isPending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
