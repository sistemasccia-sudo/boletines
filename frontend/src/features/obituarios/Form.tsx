import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { createApiErrorHandler } from '@/components/crud/apiError';
import { FormDialog } from '@/components/crud/FormDialog';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Obituario } from '@/features/obituarios/api';
import { useCreateObituario, useUpdateObituario } from '@/features/obituarios/hooks';
import { obituarioSchema, type ObituarioInput } from '@/features/obituarios/schema';

interface ObituarioFormProps {
  /** Obituario a editar; `null` = crear. */
  record?: Obituario | null;
  onClose: () => void;
}

/** Modal de creación/edición de obituarios. */
export function ObituarioForm({ record, onClose }: ObituarioFormProps) {
  const isEdit = record != null;
  const createMutation = useCreateObituario();
  const updateMutation = useUpdateObituario();
  const [serverError, setServerError] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ObituarioInput>({
    resolver: zodResolver(obituarioSchema),
    defaultValues: {
      nombre: record?.nombre ?? '',
      descripcion: record?.descripcion ?? '',
    },
  });

  const handleApiError = createApiErrorHandler<ObituarioInput>(setError, setServerError);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(undefined);
    try {
      if (record) {
        await updateMutation.mutateAsync({ id: record.id, input: values });
        toast.success('Obituario actualizado correctamente.');
      } else {
        await createMutation.mutateAsync(values);
        toast.success('Obituario creado correctamente.');
      }
      onClose();
    } catch (error) {
      handleApiError(error);
    }
  });

  return (
    <FormDialog
      open
      title={isEdit ? 'Editar obituario' : 'Nuevo obituario'}
      onClose={onClose}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      serverError={serverError}
    >
      <div className="space-y-2">
        <Label htmlFor="obituario-nombre">Nombre</Label>
        <Input
          id="obituario-nombre"
          placeholder="Nombre completo"
          autoComplete="off"
          aria-invalid={errors.nombre ? true : undefined}
          {...register('nombre')}
        />
        <FormError message={errors.nombre?.message} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="obituario-descripcion">Descripción</Label>
        <Textarea
          id="obituario-descripcion"
          rows={5}
          placeholder="Datos del difunto, velatorio, etc."
          aria-invalid={errors.descripcion ? true : undefined}
          {...register('descripcion')}
        />
        <FormError message={errors.descripcion?.message} />
      </div>
    </FormDialog>
  );
}
