import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/crud/ConfirmDialog';
import { DataTable } from '@/components/DataTable/DataTable';
import { useDataTableState } from '@/components/DataTable/useDataTableState';
import { Button } from '@/components/ui/button';
import { useFuentesList } from '@/features/fuentes/hooks';
import type { Noticia } from '@/features/noticias/api';
import { createNoticiaColumns } from '@/features/noticias/columns';
import { NoticiaForm } from '@/features/noticias/Form';
import { useDeleteNoticia, useNoticiasList } from '@/features/noticias/hooks';
import { getApiErrorMessage } from '@/lib/api';

/** Pestaña «Noticias» del módulo Bol. Noticias. */
export default function NoticiasPage() {
  const tableState = useDataTableState({ pageSize: 20, sort: 'fecha', order: 'desc' });
  const { page, pageSize, sort, order, filters } = tableState;

  const listQuery = useNoticiasList({ page, pageSize, sort, order, filters });
  const deleteMutation = useDeleteNoticia();
  const fuentesQuery = useFuentesList({ page: 1, pageSize: 100, sort: 'nombre', order: 'asc' });

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Noticia | null>(null);
  const [deleting, setDeleting] = useState<Noticia | null>(null);

  const fuenteOptions = (fuentesQuery.data?.data ?? []).map((fuente) => ({
    value: String(fuente.codigo),
    label: fuente.nombre,
  }));

  const columns = createNoticiaColumns(
    {
      onEdit: (noticia) => {
        setEditing(noticia);
        setIsFormOpen(true);
      },
      onDelete: (noticia) => setDeleting(noticia),
    },
    fuenteOptions,
  );

  const handleConfirmDelete = async () => {
    if (!deleting) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success('Noticia eliminada correctamente.');
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
        emptyMessage="No hay noticias registradas."
        toolbarActions={
          <Button
            type="button"
            onClick={() => {
              setEditing(null);
              setIsFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva noticia
          </Button>
        }
      />

      {isFormOpen && <NoticiaForm record={editing} onClose={() => setIsFormOpen(false)} />}

      <ConfirmDialog
        open={deleting != null}
        title="Eliminar noticia"
        description={deleting ? `Se eliminará «${deleting.titulo}» definitivamente.` : undefined}
        isPending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
