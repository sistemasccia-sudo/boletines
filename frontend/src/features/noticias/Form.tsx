import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

import { createApiErrorHandler } from '@/components/crud/apiError';
import { FormDialog } from '@/components/crud/FormDialog';
import { ImageUpload } from '@/components/ImageUpload/ImageUpload';
import { RichTextEditor } from '@/components/RichTextEditor/RichTextEditor';
import { Checkbox } from '@/components/ui/checkbox';
import { FormError } from '@/components/ui/form-error';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useFuentesList } from '@/features/fuentes/hooks';
import type { Noticia } from '@/features/noticias/api';
import {
  useCreateNoticia,
  useNoticiaDetalle,
  useUpdateNoticia,
} from '@/features/noticias/hooks';
import {
  normalizeTipo,
  noticiaSchema,
  TIPOS_NOTICIA,
  type NoticiaFormValues,
  type NoticiaInput,
} from '@/features/noticias/schema';
import { uploadEditorImage, uploadImage } from '@/lib/upload';

/** Errores de la subida (`archivo`) → campo `imagen` del formulario. */
const UPLOAD_FIELD_ALIASES: Record<string, string> = { archivo: 'imagen' };

interface NoticiaFormProps {
  /** Noticia a editar (viene del listado); `null` = crear. */
  record?: Noticia | null;
  onClose: () => void;
}

/** Modal de creación/edición de noticias (detalle con `cuerpo` cargado por id). */
export function NoticiaForm({ record, onClose }: NoticiaFormProps) {
  const isEdit = record != null;
  const createMutation = useCreateNoticia();
  const updateMutation = useUpdateNoticia();
  const [serverError, setServerError] = useState<string | undefined>();
  const [removedImage, setRemovedImage] = useState(false);

  const fuentesQuery = useFuentesList({ page: 1, pageSize: 100, sort: 'nombre', order: 'asc' });
  const detailQuery = useNoticiaDetalle(record?.id ?? 0, { enabled: isEdit });

  const {
    register,
    handleSubmit,
    setError,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<NoticiaFormValues>({
    resolver: zodResolver(noticiaSchema),
    defaultValues: {
      titulo: record?.titulo ?? '',
      bajada: record?.bajada ?? '',
      cuerpo: record?.cuerpo ?? '',
      tipo: normalizeTipo(record?.tipo),
      fuente_codigo: record?.fuente_codigo ?? '',
      fecha: record?.fecha ?? '',
      mostrar_en_web: record?.mostrar_en_web ?? true,
      imagen: null,
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
      bajada: detalle.bajada ?? '',
      cuerpo: detalle.cuerpo ?? '',
      tipo: normalizeTipo(detalle.tipo),
      fuente_codigo: detalle.fuente_codigo ?? '',
      fecha: detalle.fecha,
      mostrar_en_web: detalle.mostrar_en_web,
      imagen: null,
    });
  }, [detailQuery.data, reset]);

  const handleApiError = createApiErrorHandler<NoticiaFormValues>(
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
      const input: NoticiaInput = { ...rest };

      if (imagen) {
        const uploaded = await uploadImage(imagen, 'noticias');
        input.imagen = uploaded.path;
      } else if (removedImage) {
        // «Quitar imagen actual»: clave presente con null ⇒ el backend la borra.
        input.imagen = null;
      }
      // Sin clave `imagen` ⇒ la imagen existente no cambia.

      if (record) {
        await updateMutation.mutateAsync({ id: record.id, input });
        toast.success('Noticia actualizada correctamente.');
      } else {
        await createMutation.mutateAsync(input);
        toast.success('Noticia creada correctamente.');
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
      title={isEdit ? 'Editar noticia' : 'Nueva noticia'}
      onClose={onClose}
      onSubmit={onSubmit}
      isSubmitting={isSubmitting}
      disableSubmit={detailLoading || detailError}
      serverError={serverError}
    >
      {detailLoading ? (
        <div role="status" aria-label="Cargando noticia" className="space-y-3">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : detailError ? (
        <FormError message="No se pudo cargar la noticia para editar. Cierre e intente de nuevo." />
      ) : (
        <>
          <div className="space-y-2">
            <Label htmlFor="noticia-titulo">Título</Label>
            <Textarea
              id="noticia-titulo"
              rows={2}
              placeholder="Título de la noticia"
              aria-invalid={errors.titulo ? true : undefined}
              {...register('titulo')}
            />
            <FormError message={errors.titulo?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="noticia-bajada">Bajada</Label>
            <Textarea
              id="noticia-bajada"
              rows={2}
              placeholder="Resumen breve (opcional)"
              aria-invalid={errors.bajada ? true : undefined}
              {...register('bajada')}
            />
            <FormError message={errors.bajada?.message} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="noticia-cuerpo">Cuerpo</Label>
            <RichTextEditor
              id="noticia-cuerpo"
              value={watch('cuerpo')}
              onChange={(html) =>
                setValue('cuerpo', html, { shouldValidate: true, shouldDirty: true })
              }
              placeholder="Escriba el cuerpo de la noticia…"
              ariaLabel="Cuerpo de la noticia"
              onImageUpload={uploadEditorImage}
            />
            <FormError message={errors.cuerpo?.message} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="noticia-tipo">Tipo</Label>
              <Select
                id="noticia-tipo"
                aria-invalid={errors.tipo ? true : undefined}
                {...register('tipo')}
              >
                {TIPOS_NOTICIA.map((tipo) => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label}
                  </option>
                ))}
              </Select>
              <FormError message={errors.tipo?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="noticia-fuente">Fuente</Label>
              <Select id="noticia-fuente" {...register('fuente_codigo')}>
                <option value="">Sin fuente</option>
                {fuentesQuery.data?.data.map((fuente) => (
                  <option key={fuente.id} value={String(fuente.codigo)}>
                    {fuente.nombre}
                  </option>
                ))}
              </Select>
              <FormError message={errors.fuente_codigo?.message} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="noticia-fecha">Fecha</Label>
              <Input
                id="noticia-fecha"
                type="date"
                aria-invalid={errors.fecha ? true : undefined}
                {...register('fecha')}
              />
              <FormError message={errors.fecha?.message} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="noticia-web" {...register('mostrar_en_web')} />
            <Label htmlFor="noticia-web" className="font-normal">
              Mostrar en la página web
            </Label>
          </div>

          <div className="space-y-2">
            <Label>Imagen</Label>
            <ImageUpload
              value={watch('imagen')}
              onChange={(file) => setValue('imagen', file, { shouldValidate: true, shouldDirty: true })}
              currentImageUrl={isEdit && !removedImage ? record?.imagen ?? null : null}
              onRemoveCurrent={() => setRemovedImage(true)}
              ariaLabel="Imagen de la noticia"
            />
            <FormError message={errors.imagen?.message} />
          </div>
        </>
      )}
    </FormDialog>
  );
}
