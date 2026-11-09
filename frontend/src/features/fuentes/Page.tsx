import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/crud/ConfirmDialog';
import { DataTable } from '@/components/DataTable/DataTable';
import { useDataTableState } from '@/components/DataTable/useDataTableState';
import { Button } from '@/components/ui/button';
import type { Fuente } from '@/features/fuentes/api';
import { createFuenteColumns } from '@/features/fuentes/columns';
import { FuenteForm } from '@/features/fuentes/Form';
import { useDeleteFuente, useFuentesList } from '@/features/fuentes/hooks';
import { getApiErrorMessage } from '@/lib/api';

/** Pestaña «Fuentes de información» del módulo Bol. Noticias. */
export default function FuentesPage() {
  const tableState = useDataTableState({ pageSize: 20, sort: 'codigo', order: 'asc' });
  const { page, pageSize, sort, order, filters } = tableState;

  const listQuery = useFuentesList({ page, pageSize, sort, order, filters });
  const deleteMutation = useDeleteFuente();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Fuente | null>(null);
  const [deleting, setDeleting] = useState<Fuente | null>(null);

  const columns = createFuenteColumns({
    onEdit: (fuente) => {
      setEditing(fuente);
      setIsFormOpen(true);
    },
    onDelete: (fuente) => setDeleting(fuente),
  });

  const handleConfirmDelete = async () => {
    if (!deleting) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success('Fuente eliminada correctamente.');
      setDeleting(null);
    } catch (error) {
      // p. ej. 422 "en uso por noticias o artículos": se queda el diálogo abierto.
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
        emptyMessage="No hay fuentes registradas."
        toolbarActions={
          <Button
            type="button"
            onClick={() => {
              setEditing(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva fuente
          </Button>
        }
      />

      {isFormOpen && <FuenteForm record={editing} onClose={() => setIsFormOpen(false)} />}

      <ConfirmDialog
        open={deleting != null}
        title="Eliminar fuente"
        description={
          deleting
            ? `Se eliminará «${deleting.nombre}». Si está en uso por noticias o artículos, no será posible.`
            : undefined
        }
        isPending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
