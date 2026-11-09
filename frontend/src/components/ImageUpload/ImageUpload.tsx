import { Upload, X } from 'lucide-react';
import { useEffect, useRef, useState, type ChangeEvent } from 'react';

import { Button } from '@/components/ui/button';

/** Formatos aceptados (deben coincidir con el backend). */
const ACCEPTED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

export interface ImageUploadProps {
  /** Archivo nuevo seleccionado (null si no hay o se quitó). */
  value: File | null;
  onChange: (file: File | null) => void;
  /** Imagen ya existente en BD (modo edición); se muestra si no hay archivo nuevo. */
  currentImageUrl?: string | null;
  /**
   * Al pulsar «Quitar» sin archivo nuevo: notifica que la imagen existente
   * debe eliminarse (la forma lo marca; el backend la borra al guardar).
   */
  onRemoveCurrent?: () => void;
  maxSizeMb?: number;
  disabled?: boolean;
  /** Texto accesible del input oculto. */
  ariaLabel?: string;
}

/**
 * Selector de imagen con vista previa, validación de formato/tamaño
 * y botón para quitar. Compatible con react-hook-form (es un control controlled).
 */
export function ImageUpload({
  value,
  onChange,
  currentImageUrl = null,
  onRemoveCurrent,
  maxSizeMb = 10,
  disabled = false,
  ariaLabel = 'Imagen',
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Vista previa del archivo nuevo (object URL, revocada al cambiar/desmontar).
  useEffect(() => {
    if (!value) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(value);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [value]);

  const handleSelect = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      return;
    }

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Formato no válido. Use JPG, PNG o WebP.');
      return;
    }
    if (file.size > maxSizeMb * 1024 * 1024) {
      setError(`La imagen supera el tamaño máximo de ${maxSizeMb} MB.`);
      return;
    }

    setError(null);
    onChange(file);
  };

  const handleRemove = () => {
    setError(null);
    if (value) {
      // Hay archivo nuevo seleccionado: se quita y queda la imagen actual.
      onChange(null);
      return;
    }
    if (currentImageUrl && onRemoveCurrent) {
      // Edición: notifica que la imagen actual debe eliminarse al guardar.
      onRemoveCurrent();
      return;
    }
    onChange(null);
  };

  const url = previewUrl ?? (value ? null : currentImageUrl);

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="sr-only"
        aria-label={ariaLabel}
        tabIndex={-1}
        disabled={disabled}
        onChange={handleSelect}
      />

      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => inputRef.current?.click()}>
          <Upload className="h-4 w-4" />
          {url ? 'Cambiar imagen' : 'Seleccionar imagen'}
        </Button>

        {url && (
          <Button type="button" variant="ghost" size="sm" disabled={disabled} onClick={handleRemove}>
            <X className="h-4 w-4" />
            Quitar
          </Button>
        )}
      </div>

      {url && (
        <div className="relative w-48 overflow-hidden rounded-md border">
          <img src={url} alt="Vista previa de la imagen" className="h-32 w-full object-cover" />
          {!previewUrl && (
            <span className="absolute bottom-1 left-1 rounded bg-background/90 px-1.5 py-0.5 text-xs text-muted-foreground">
              Imagen actual
            </span>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
