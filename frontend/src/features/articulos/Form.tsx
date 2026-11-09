import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { createApiErrorHandler } from '@/components/crud/apiError';
import { FormDialog } from '@/components/crud/FormDialog';
import { ImageUpload } from '@/components/ImageUpload/ImageUpload';
import { RichTextEditor } from '@/components/RichTextEditor/RichTextEditor';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import type { Articulo } from '@/features/articulos/api';
import {
  useArticuloDetalle,
  useCreateArticulo,
  useUpdateArticulo,
} from '@/features/articulos/hooks';
import {
  articuloSchema,
  type ArticuloFormValues,
  type ArticuloInput,
} from '@/features/articulos/schema';
import { uploadEditorImage, uploadImage } from '@/lib/upload';

/** Errores de la subida (`archivo`) → campo `imagen` del formulario. */
const UPLOAD_FIELD_ALIASES: Record<string, string> = { archivo: 'imagen' };

interface ArticuloFormProps {
  /** Artículo a editar (viene del listado); `null` = crear. */
  record?: Articulo | null;
  onClose: () => void;
}

/** Modal de creación/edición de artículos (detalle con `cuerpo` cargado por id). */
export function ArticuloForm({ record, onClose }: ArticuloFormProps) {
  const isEdit = record != null;
  const createMutation = useCreateArticulo();
  const updateMutation = useUpdateArticulo();
  const [serverError, setServerError] = useState<string | undefined>();
  const [removedImage, setRemovedImage] = useState(false);

  const detailQuery = useArticuloDetalle(record?.id ?? 0, { enabled: isEdit });

  const {
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ArticuloFormValues>({
    resolver: zodResolver(articuloSchema),
    defaultValues: {
      titulo: record?.titulo ?? '',
      bajada: record?.bajada ?? '',
      cuerpo: record?.cuerpo ?? '',
      fecha: record?.fecha ?? '',
      imagen: null,
    },
  });

  // El listado no trae `cuerpo`: al llegar el detalle se completa el formulario.
  useEffect(() => {
    const detalle = detailQuery.data;
    if (!detalle) {
      return;
    }
    reset({
      titulo: detalle.titulo,
      bajada: detalle.bajada ?? '',
      cuerpo: detalle.cuerpo ?? '',
      fecha: detalle.fecha,
      imagen: null,
    });
  }, [detailQuery.data, reset]);

  const handleApiError = createApiErrorHandler<ArticuloFormValues>(
    setError,
    setServerError,
    UPLOAD_FIELD_ALIASES,
  );

  const detailLoading = isEdit && detailQuery.isLoading;
  const detailError = isEdit && detailQuery.isError;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(undefined);
    try {
      const { imagen, ...rest } = values;
      const input: ArticuloInput = { ...rest };

      if (imagen) {
        const uploaded = await uploadImage(imagen, 'articulos');
        input.imagen = uploaded.path;
      } else if (removedImage) {
        // «Quitar imagen actual»: clave presente con null ⇒ el backend la borra.
        input.imagen = null;
      }
      // Sin clave `imagen` ⇒ la imagen existente no cambia.

      if (record) {
        await updateMutation.mutateAsync({ id: record.id, input });
        toast.success('Artículo actualizado correctamente.');
      } else {
        await createMutation.mutateAsync(input);
        toast.success('Artículo creado correctamente.');
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
      title={isEdit ? 'Editar artículo' : 'Nuevo artículo'}
      onClose={onClose}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      disableSubmit={detailLoading || detailError}
      serverError={serverError}
    >
      {detailLoading ? (
        <div role="status" aria-label="Cargando artículo" className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : detailError ? (
        <FormError message="No se pudo cargar el artículo para editar. Cierre e intente de nuevo." />
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="articulo-titulo">Título</Label>
            <Textarea
              id="articulo-titulo"
              rows={2}
              placeholder="Título del artículo"
              aria-invalid={errors.titulo ? true : undefined}
              {...register('titulo')}
            />
            <FormError message={errors.titulo?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="articulo-bajada">Bajada</Label>
            <Textarea
              id="articulo-bajada"
              rows={2}
              placeholder="Resumen breve (opcional)"
              aria-invalid={errors.bajada ? true : undefined}
              {...register('bajada')}
            />
            <FormError message={errors.bajada?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="articulo-cuerpo">Cuerpo</Label>
            <RichTextEditor
              id="articulo-cuerpo"
              value={watch('cuerpo')}
              onChange={(html) =>
                setValue('cuerpo', html, { shouldValidate: true, shouldDirty: true })
              }
              placeholder="Escriba el cuerpo del artículo…"
              ariaLabel="Cuerpo del artículo"
              onImageUpload={uploadEditorImage}
            />
            <FormError message={errors.cuerpo?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="articulo-fecha">Fecha</Label>
            <Input
              id="articulo-fecha"
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
              currentImageUrl={isEdit && !removedImage ? record?.imagen ?? null : null}
              onRemoveCurrent={() => setRemovedImage(true)}
              ariaLabel="Imagen del artículo"
            />
            <FormError message={errors.imagen?.message} />
          </div>
        </>
      )}
    </FormDialog>
  );
}
