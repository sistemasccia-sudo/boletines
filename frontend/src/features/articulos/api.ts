/** Registro de artículo (tabla legacy `tarticulo`). */
export interface Articulo {
  id: number;
  titulo: string;
  bajada: string | null;
  /** Fecha ISO (AAAA-MM-DD); la asigna el servidor si no viene. */
  fecha: string;
  /** URL absoluta de la imagen (WebP) o null. */
  imagen: string | null;
  /** URL absoluta de la miniatura; null si no hay miniatura. */
  imagen_thumb: string | null;
  /** Solo en detalle/edición: HTML sanitizado por el backend. */
  cuerpo?: string;
}
