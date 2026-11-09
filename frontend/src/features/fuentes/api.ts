/** Registro de fuente de información (tabla legacy `fuente_diarios`). */
export interface Fuente {
  id: number;
  /** Código que guardan las noticias/artículos en `fkfuente` (texto en BD). */
  codigo: number;
  nombre: string;
  /** Flag legacy de alta/baja (1 = activa); se muestra tal cual. */
  state: number;
}
