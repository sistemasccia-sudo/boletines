/** Noticia en la lista de «Cambiar orden» (solo noticias del día). */
export interface NoticiaOrden {
  id: number;
  titulo: string;
  /** Posición de la noticia dentro de su día. */
  orden: number;
  /** Fecha ISO (AAAA-MM-DD). */
  fecha: string;
}

/** Respuesta de GET /noticias/orden y de POST /noticias/orden/intercambiar. */
export interface OrdenDelDia {
  /** Día consultado (America/Lima). */
  fecha: string;
  data: NoticiaOrden[];
}
