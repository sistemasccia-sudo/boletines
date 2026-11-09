import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { createApiErrorHandler } from '@/components/crud/apiError';
import { FormDialog } from '@/components/crud/FormDialog';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import type { TipoCambio } from '@/features/tipo-cambio/api';
import { useCreateTipoCambio, useUpdateTipoCambio } from '@/features/tipo-cambio/hooks';
import {
  FUENTES_TIPO_CAMBIO,
  tipoCambioSchema,
  type TipoCambioInput,
} from '@/features/tipo-cambio/schema';

interface TipoCambioFormProps {
  /** Registro a editar (el listado trae todos los campos); `null` = crear. */
  record?: TipoCambio | null;
  onClose: () => void;
}

/** Modal de creación/edición de tipo de cambio (un registro por fecha; cada campo se guarda por separado). */
export function TipoCambioForm({ record, onClose }: TipoCambioFormProps) {
  const isEdit = record != null;
  const createMutation = useCreateTipoCambio();
  const updateMutation = useUpdateTipoCambio();
  const [serverError, setServerError] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<TipoCambioInput>({
    resolver: zodResolver(tipoCambioSchema),
    defaultValues: {
      // Si la fuente guardada no está en la lista (dato legacy), se usa SUNAT.
      fuente: FUENTES_TIPO_CAMBIO.find((fuente) => fuente.value === record?.fuente)?.value ?? 'SUNAT',
      compra: record?.compra ?? '',
      venta: record?.venta ?? '',
      fecha: record?.fecha ?? '',
    },
  });

  const handleApiError = createApiErrorHandler<TipoCambioInput>(setError, setServerError);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(undefined);
    try {
      if (record) {
        await updateMutation.mutateAsync({ id: record.id, input: values });
        toast.success('Tipo de cambio actualizado correctamente.');
      } else {
        await createMutation.mutateAsync(values);
        toast.success('Tipo de cambio registrado correctamente.');
      }
      onClose();
    } catch (error) {
      // El 422 de duplicado llega en el campo `fecha` y se muestra ahí mismo.
      handleApiError(error);
    }
  });

  return (
    <FormDialog
      open
      title={isEdit ? 'Editar tipo de cambio' : 'Nuevo tipo de cambio'}
      description="Un registro por fecha; la fuente y los montos se guardan por separado."
      onClose={onClose}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      serverError={serverError}
    >
      <div className="space-y-2">
        <Label htmlFor="tipo-cambio-fuente">Fuente</Label>
        <Select id="tipo-cambio-fuente" aria-invalid={errors.fuente ? true : undefined} {...register('fuente')}>
          {FUENTES_TIPO_CAMBIO.map((fuente) => (
            <option key={fuente.value} value={fuente.value}>
              {fuente.label}
            </option>
          ))}
        </Select>
        <FormError message={errors.fuente?.message} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="tipo-cambio-compra">Compra</Label>
          <Input
            id="tipo-cambio-compra"
            inputMode="decimal"
            placeholder="3.7450"
            autoComplete="off"
            aria-invalid={errors.compra ? true : undefined}
            {...register('compra')}
          />
          <FormError message={errors.compra?.message} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tipo-cambio-venta">Venta</Label>
          <Input
            id="tipo-cambio-venta"
            inputMode="decimal"
            placeholder="3.7650"
            autoComplete="off"
            aria-invalid={errors.venta ? true : undefined}
            {...register('venta')}
          />
          <FormError message={errors.venta?.message} />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tipo-cambio-fecha">Fecha</Label>
        <Input
          id="tipo-cambio-fecha"
          type="date"
          aria-invalid={errors.fecha ? true : undefined}
          {...register('fecha')}
        />
        <FormError message={errors.fecha?.message} />
      </div>
    </FormDialog>
  );
}
