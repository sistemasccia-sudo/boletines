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
import type { Carta } from '@/features/cartas/api';
import { useCreateCarta, useUpdateCarta } from '@/features/cartas/hooks';
import { cartaSchema, type CartaInput } from '@/features/cartas/schema';

interface CartaFormProps {
  /** Carta a editar (viene del listado); `null` = crear. */
  record?: Carta | null;
  /** Código sugerido para crear (traído de `/cartas/siguiente-codigo`). */
  defaultCodigo?: string;
  onClose: () => void;
}

/** Modal de creación/edición de cartas. */
export function CartaForm({ record, defaultCodigo, onClose }: CartaFormProps) {
  const isEdit = record != null;
  const createMutation = useCreateCarta();
  const updateMutation = useUpdateCarta();
  const [serverError, setServerError] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CartaInput>({
    resolver: zodResolver(cartaSchema),
    defaultValues: {
      codigo: record?.codigo ?? defaultCodigo ?? '',
      remitente: record?.remitente ?? '',
      destinatario: record?.destinatario ?? '',
      asunto: record?.asunto ?? '',
    },
  });

  const handleApiError = createApiErrorHandler<CartaInput>(setError, setServerError);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(undefined);
    try {
      if (record) {
        await updateMutation.mutateAsync({ id: record.id, input: values });
        toast.success('Carta actualizada correctamente.');
      } else {
        await createMutation.mutateAsync(values);
        toast.success('Carta registrada correctamente.');
      }
      onClose();
    } catch (error) {
      // El 422 de código duplicado llega en el campo `codigo` (con el sugerido).
      handleApiError(error);
    }
  });

  return (
    <FormDialog
      open
      title={isEdit ? 'Editar carta' : 'Nueva carta'}
      description={
        isEdit ? undefined : 'Código correlativo del año (el backend calcula el siguiente).'
      }
      onClose={onClose}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      serverError={serverError}
    >
      <div className="space-y-2">
        <Label htmlFor="carta-codigo">Código</Label>
        <Input
          id="carta-codigo"
          placeholder="571-2026"
          inputMode="numeric"
          autoComplete="off"
          aria-invalid={errors.codigo ? true : undefined}
          {...register('codigo')}
        />
        <FormError message={errors.codigo?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="carta-remitente">Remitente</Label>
          <Input
            id="carta-remitente"
            placeholder="Quién envía la carta"
            autoComplete="off"
            aria-invalid={errors.remitente ? true : undefined}
            {...register('remitente')}
          />
          <FormError message={errors.remitente?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="carta-destinatario">Destinatario</Label>
          <Input
            id="carta-destinatario"
            placeholder="A quién va dirigida"
            autoComplete="off"
            aria-invalid={errors.destinatario ? true : undefined}
            {...register('destinatario')}
          />
          <FormError message={errors.destinatario?.message} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="carta-asunto">Asunto</Label>
        <Textarea
          id="carta-asunto"
          rows={3}
          placeholder="Asunto de la carta"
          aria-invalid={errors.asunto ? true : undefined}
          {...register('asunto')}
        />
        <FormError message={errors.asunto?.message} />
      </div>
    </FormDialog>
  );
}
