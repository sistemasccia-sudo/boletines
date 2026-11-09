import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { createApiErrorHandler } from '@/components/crud/apiError';
import { FormDialog } from '@/components/crud/FormDialog';
import { ImageUpload } from '@/components/ImageUpload/ImageUpload';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreatePortada } from '@/features/portadas/hooks';
import { portadaSchema, todayInLima, type PortadaFormValues } from '@/features/portadas/schema';
import { uploadImage } from '@/lib/upload';

/** Errores de la subida (`archivo`) → campo `imagen` del formulario. */
const UPLOAD_FIELD_ALIASES: Record<string, string> = { archivo: 'imagen' };

interface PortadaFormProps {
  onClose: () => void;
}

/** Modal de subida de portada (fecha + imagen obligatoria). */
export function PortadaForm({ onClose }: PortadaFormProps) {
  const createMutation = useCreatePortada();
  const [serverError, setServerError] = useState<string | undefined>();

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<PortadaFormValues>({
    resolver: zodResolver(portadaSchema),
    defaultValues: { fecha: todayInLima(), imagen: null },
  });

  const handleApiError = createApiErrorHandler<PortadaFormValues>(
    setError,
    setServerError,
    UPLOAD_FIELD_ALIASES,
  );

  const onSubmit = handleSubmit(async (values) => {
    if (!values.imagen) {
      return; // ya lo cubre la validación del schema; guard defensivo para el tipado
    }
    setServerError(undefined);
    try {
      const uploaded = await uploadImage(values.imagen, 'portadas');
      await createMutation.mutateAsync({ fecha: values.fecha, archivo: uploaded.path });
      toast.success('Portada subida correctamente.');
      onClose();
    } catch (error) {
      handleApiError(error);
    }
  });

  return (
    <FormDialog
      open
      title="Nueva portada"
      description="La imagen se convierte a WebP y se recorta al tamaño de portada."
      onClose={onClose}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      serverError={serverError}
      submitLabel="Subir portada"
    >
      <div className="space-y-2">
        <Label htmlFor="portada-fecha">Fecha</Label>
        <Input
          id="portada-fecha"
          type="date"
          aria-invalid={errors.fecha ? true : undefined}
          {...register('fecha')}
        />
        <FormError message={errors.fecha?.message} />
      </div>

      <div className="space-y-2">
        <Label>Imagen</Label>
        <ImageUpload
          value={watch('imagen')}
          onChange={(file) =>
            setValue('imagen', file, { shouldValidate: true, shouldDirty: true })
          }
          ariaLabel="Imagen de portada"
        />
        <FormError message={errors.imagen?.message} />
      </div>
    </FormDialog>
  );
}
