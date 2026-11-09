/** Registro de carta (tabla legacy `cartas`). */
export interface Carta {
  id: number;
  /** Código correlativo NNN-AAAA (p. ej. «571-2026»). */
  codigo: string;
  remitente: string;
  destinatario: string;
  asunto: string;
  /** Fecha de registro (AAAA-MM-DD). */
  fecha: string;
  /** Usuario que registró la carta (`usuarios.nombres` + `apellidos`). */
  usuario: string;
}

/** Respuesta de GET /cartas/siguiente-codigo. */
export interface SiguienteCodigo {
  codigo: string;
}
