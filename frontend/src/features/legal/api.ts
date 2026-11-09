/** Registro de norma legal (tabla legacy `normas_legales`). */
export interface Legal {
  id: number;
  /** Título (columna legacy `titular`). */
  titulo: string;
  /** Norma legal, p. ej. «D.S. N° 001-2026» (columna legacy `bajada`). */
  norma_legal: string | null;
  /** Fecha ISO (AAAA-MM-DD). */
  fecha: string;
  /** Solo en el detalle: el listado no lo trae (HTML pesado). */
  cuerpo: string;
}
