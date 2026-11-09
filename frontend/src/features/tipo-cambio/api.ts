/** Registro de tipo de cambio (tabla legacy `tcambio`). */
export interface TipoCambio {
  id: number;
  /** Fecha ISO (AAAA-MM-DD). */
  fecha: string;
  /** Monto de compra, guardado en VARCHAR (p. ej. "3.745"). */
  compra: string;
  /** Monto de venta, igual que `compra`. */
  venta: string;
  /** Fuente del registro (columna `fuente`): SUNAT | RPP | EL COMERCIO. */
  fuente: string;
}
