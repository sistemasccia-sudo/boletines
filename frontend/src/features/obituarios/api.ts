/** Registro de obituario (tabla legacy `tobituario`). */
export interface Obituario {
  id: number;
  nombre: string;
  descripcion: string;
  /** Campos del legacy: la app solo gestiona nombre y descripción. */
  velatorio: string | null;
  cementerio: string | null;
  /** Fecha de registro: la asigna el servidor (hoy, America/Lima). */
  fecha: string;
}
