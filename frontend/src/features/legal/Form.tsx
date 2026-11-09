import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { createApiErrorHandler } from '@/components/crud/apiError';
import { FormDialog } from '@/components/crud/FormDialog';
import { RichTextEditor } from '@/components/RichTextEditor/RichTextEditor';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import type { Legal } from '@/features/legal/api';
import { useCreateLegal, useLegalDetalle, useUpdateLegal } from '@/features/legal/hooks';
import { hoyLima, legalSchema, type LegalInput } from '@/features/legal/schema';
import { uploadEditorImage } from '@/lib/upload';

interface LegalFormProps {
  /** Norma a editar (viene del listado); `null` = crear. */
  record?: Legal | null;
  onClose: () => void;
}

/** Modal de creación/edición de normas legales (detalle con `cuerpo` cargado por id). */
export function LegalForm({ record, onClose }: LegalFormProps) {
  const isEdit = record != null;
  const createMutation = useCreateLegal();
  const updateMutation = useUpdateLegal();
  const [serverError, setServerError] = useState<string | undefined>();

  const detailQuery = useLegalDetalle(record?.id ?? 0, { enabled: isEdit });

  const {
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LegalInput>({
    resolver: zodResolver(legalSchema),
    defaultValues: {
      titulo: record?.titulo ?? '',
      norma_legal: record?.norma_legal ?? '',
      cuerpo: record?.cuerpo ?? '',
      // Por defecto, la fecha actual (America/Lima).
      fecha: record?.fecha ?? hoyLima(),
    },
  });

  // El listado no trae `cuerpo`: al llegar el detalle se completa el formulario
  // (los campos aún no se muestran, así que no se pierden ediciones).
  useEffect(() => {
    const detalle = detailQuery.data;
    if (!detalle) {
      return;
    }
    reset({
      titulo: detalle.titulo,
      norma_legal: detalle.norma_legal ?? '',
      cuerpo: detalle.cuerpo ?? '',
      fecha: detalle.fecha,
    });
  }, [detailQuery.data, reset]);

  const handleApiError = createApiErrorHandler<LegalInput>(setError, setServerError);

  const detailLoading = isEdit && detailQuery.isLoading;
  const detailError = isEdit && detailQuery.isError;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(undefined);
    try {
      if (record) {
        await updateMutation.mutateAsync({ id: record.id, input: values });
        toast.success('Norma legal actualizada correctamente.');
      } else {
        await createMutation.mutateAsync(values);
        toast.success('Norma legal creada correctamente.');
      }
      onClose();
    } catch (error) {
      handleApiError(error);
    }
  });

  return (
    <FormDialog
      open
      wide
      title={isEdit ? 'Editar norma legal' : 'Nueva norma legal'}
      onClose={onClose}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      disableSubmit={detailLoading || detailError}
      serverError={serverError}
    >
      {detailLoading ? (
        <div role="status" aria-label="Cargando norma legal" className="space-y-3">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : detailError ? (
        <FormError message="No se pudo cargar la norma para editar. Cierre e intente de nuevo." />
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="legal-titulo">Título</Label>
            <Textarea
              id="legal-titulo"
              rows={2}
              placeholder="Título de la norma"
              aria-invalid={errors.titulo ? true : undefined}
              {...register('titulo')}
            />
            <FormError message={errors.titulo?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="legal-norma">Norma legal</Label>
            <Textarea
              id="legal-norma"
              rows={2}
              placeholder="Ej. Decreto Supremo N° 001-2026"
              aria-invalid={errors.norma_legal ? true : undefined}
              {...register('norma_legal')}
            />
            <FormError message={errors.norma_legal?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="legal-cuerpo">Cuerpo (opcional)</Label>
            <RichTextEditor
              id="legal-cuerpo"
              value={watch('cuerpo')}
              onChange={(html) =>
                setValue('cuerpo', html, { shouldValidate: true, shouldDirty: true })
              }
              placeholder="Escriba el cuerpo de la norma…"
              ariaLabel="Cuerpo de la norma"
              onImageUpload={uploadEditorImage}
            />
            <FormError message={errors.cuerpo?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="legal-fecha">Fecha</Label>
            <Input
              id="legal-fecha"
              type="date"
              aria-invalid={errors.fecha ? true : undefined}
              {...register('fecha')}
            />
            <FormError message={errors.fecha?.message} />
          </div>
        </>
      )}
    </FormDialog>
  );
}
