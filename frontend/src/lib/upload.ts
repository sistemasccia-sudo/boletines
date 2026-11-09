import { api } from '@/lib/api';

/** Contextos de subida aceptados por `POST /api/v1/uploads`. */
export type UploadContext = 'editor' | 'noticias' | 'articulos' | 'portadas';

/** Respuesta de la API de subida: ruta relativa (BD) y URL absoluta. */
export interface UploadResult {
  path: string;
  thumb_path: string;
  url: string;
  thumb_url: string;
}

/**
 * Sube una imagen en `multipart/form-data`. El backend la valida (MIME real,
 * tamaño), la convierte a WebP, redimensiona y genera la miniatura.
 */
export async function uploadImage(file: File, contexto: UploadContext): Promise<UploadResult> {
  const formData = new FormData();
  formData.append('archivo', file);
  formData.append('contexto', contexto);

  const { data } = await api.post<UploadResult>('/uploads', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return data;
}

/** Sube una imagen del editor (TipTap) y devuelve su URL para insertarla. */
export async function uploadEditorImage(file: File): Promise<string> {
  return (await uploadImage(file, 'editor')).url;
}
