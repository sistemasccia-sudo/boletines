/** Registro de noticia (tabla legacy `tnoticia`). */
export interface Noticia {
  id: number;
  titulo: string;
  bajada: string | null;
  /** Fecha ISO (AAAA-MM-DD); la asigna el servidor si no viene. */
  fecha: string;
  /** Tipo legacy: `1=local, 2=nacional, 3=internacional, 4=informe económico`. */
  tipo: string | null;
  /** Código de fuente (`fuente_diarios.codigo`) guardado como texto. */
  fuente_codigo: string | null;
  fuente_nombre: string | null;
  /** Mapea la columna legacy `pagina_web`. */
  mostrar_en_web: boolean;
  /** URL absoluta de la imagen (WebP) o null. */
  imagen: string | null;
  /** URL absoluta de la miniatura; null si no hay miniatura. */
  imagen_thumb: string | null;
  /** Solo en detalle/edición: HTML sanitizado por el backend. */
  cuerpo?: string;
}
