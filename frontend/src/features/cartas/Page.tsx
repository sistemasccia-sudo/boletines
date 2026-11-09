import { useQueryClient } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { ConfirmDialog } from '@/components/crud/ConfirmDialog';
import { DataTable } from '@/components/DataTable/DataTable';
import { useDataTableState } from '@/components/DataTable/useDataTableState';
import { Button } from '@/components/ui/button';
import type { Carta, SiguienteCodigo } from '@/features/cartas/api';
import { createCartaColumns } from '@/features/cartas/columns';
import { CartaForm } from '@/features/cartas/Form';
import { useCartasList, useDeleteCarta } from '@/features/cartas/hooks';
import { api, getApiErrorMessage } from '@/lib/api';

/** Página del módulo Cartas (sección única). */
export default function CartasPage() {
  const tableState = useDataTableState({ pageSize: 20, sort: 'fecha', order: 'desc' });
  const { page, pageSize, sort, order, filters } = tableState;

  const listQuery = useCartasList({ page, pageSize, sort, order, filters });
  const deleteMutation = useDeleteCarta();
  const queryClient = useQueryClient();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<Carta | null>(null);
  const [nuevoCodigo, setNuevoCodigo] = useState('');
  const [deleting, setDeleting] = useState<Carta | null>(null);

  const columns = createCartaColumns({
    onEdit: (carta) => {
      setEditing(carta);
      setIsFormOpen(true);
    },
    onDelete: (carta) => setDeleting(carta),
  });

  /** «Nueva carta»: trae el siguiente código antes de abrir el formulario. */
  const handleNuevaCarta = async () => {
    try {
      const sig = await queryClient.fetchQuery<SiguienteCodigo>({
        queryKey: ['cartas', 'siguiente'],
        queryFn: async () =>
          (await api.get<SiguienteCodigo>('/cartas/siguiente-codigo')).data,
        staleTime: 30_000,
      });
      setNuevoCodigo(sig.codigo);
    } catch {
      // Sin el código del backend el usuario lo escribe a mano.
      setNuevoCodigo('');
    }
    setEditing(null);
    setIsFormOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleting) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(deleting.id);
      toast.success('Carta eliminada correctamente.');
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
        emptyMessage="No hay cartas registradas."
        toolbarActions={
          <Button type="button" onClick={handleNuevaCarta}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Nueva carta
          </Button>
        }
      />

      {isFormOpen && (
        <CartaForm
          record={editing}
          defaultCodigo={nuevoCodigo}
          onClose={() => setIsFormOpen(false)}
        />
      )}

      <ConfirmDialog
        open={deleting != null}
        title="Eliminar carta"
        description={
          deleting
            ? `Se eliminará la carta ${deleting.codigo} de «${deleting.remitente}».`
            : undefined
        }
        isPending={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  );
}
