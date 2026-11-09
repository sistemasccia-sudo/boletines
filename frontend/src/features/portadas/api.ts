/** Registro de portada (tabla legacy `tportada`). */
export interface Portada {
  id: number;
  /** Fecha ISO (AAAA-MM-DD). */
  fecha: string;
  /** URL absoluta de la imagen (WebP) o null. */
  archivo: string | null;
  /** URL absoluta de la miniatura; null si no hay miniatura. */
  archivo_thumb: string | null;
}
