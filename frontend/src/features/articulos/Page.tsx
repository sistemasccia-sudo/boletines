import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/crud/ConfirmDialog';
import { DataTable } from '@/components/DataTable/DataTable';
import { useDataTableState } from '@/components/DataTable/useDataTableState';
import { Button } from '@/components/ui/button';
import type { Articulo } from '@/features/articulos/api';
import { createArticuloColumns } from '@/features/articulos/columns';
import { ArticuloForm } from '@/features/articulos/Form';
import { useArticulosList, useDeleteArticulo } from '@/features/articulos/hooks';
import { getApiErrorMessage } from '@/lib/api';

/** Pestaña «Artículos» del módulo Bol. Noticias. */
export default function ArticulosPage() {
  const tableState = useDataTableState({ pageSize: 20, sort: 'fecha', order: 'desc' });
  const { page, pageSize, sort, order, filters } = tableState;

  const listQuery = useArticulosList({ page, pageSize, sort, order, filters });
  const deleteMutation = useDeleteArticulo();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Articulo | null>(null);
  const [deleting, setDeleting] = useState<Articulo | null>(null);

  const columns = createArticuloColumns({
    onEdit: (articulo) => {
      setEditing(articulo);
      setIsFormOpen(true);
    },
    onDelete: (articulo) => setDeleting(articulo),
  });

  const handleConfirmDelete = async () => {
    if (!deleting) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success('Artículo eliminado correctamente.');
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
        emptyMessage="No hay artículos registrados."
        toolbarActions={
          <Button
            type="button"
            onClick={() => {
              setEditing(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nuevo artículo
          </Button>
        }
      />

      {isFormOpen && <ArticuloForm record={editing} onClose={() => setIsFormOpen(false)} />}

      <ConfirmDialog
        open={deleting != null}
        title="Eliminar artículo"
        description={deleting ? `Se eliminará «${deleting.titulo}» definitivamente.` : undefined}
        isPending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
