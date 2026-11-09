import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { createApiErrorHandler } from '@/components/crud/apiError';
import { FormDialog } from '@/components/crud/FormDialog';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Fuente } from '@/features/fuentes/api';
import { useCreateFuente, useUpdateFuente } from '@/features/fuentes/hooks';
import { fuenteSchema, type FuenteInput } from '@/features/fuentes/schema';

interface FuenteFormProps {
  /** Fuente a editar; `null` = crear. El diálogo solo monta ya abierto. */
  record?: Fuente | null;
  onClose: () => void;
}

/** Modal de creación/edición de fuentes de información. */
export function FuenteForm({ record, onClose }: FuenteFormProps) {
  const isEdit = record != null;
  const createMutation = useCreateFuente();
  const updateMutation = useUpdateFuente();
  const [serverError, setServerError] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FuenteInput>({
    resolver: zodResolver(fuenteSchema),
    defaultValues: { nombre: record?.nombre ?? '' },
  });

  const handleApiError = createApiErrorHandler<FuenteInput>(setError, setServerError);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(undefined);
    try {
      if (record) {
        await updateMutation.mutateAsync({ id: record.id, input: values });
        toast.success('Fuente actualizada correctamente.');
      } else {
        await createMutation.mutateAsync(values);
        toast.success('Fuente creada correctamente.');
      }
      onClose();
    } catch (error) {
      handleApiError(error);
    }
  });

  return (
    <FormDialog
      open
      title={isEdit ? 'Editar fuente' : 'Nueva fuente'}
      description="El código se genera automáticamente de forma consecutiva."
      onClose={onClose}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      serverError={serverError}
    >
      <div className="space-y-2">
        <Label htmlFor="fuente-nombre">Nombre</Label>
        <Input
          id="fuente-nombre"
          placeholder="Ej. Agencia Andina"
          autoComplete="off"
          aria-invalid={errors.nombre ? true : undefined}
          {...register('nombre')}
        />
        <FormError message={errors.nombre?.message} />
      </div>
    </FormDialog>
  );
}
