import { z } from 'zod';

const fuenteEnum = z.enum(['SUNAT', 'RPP', 'EL COMERCIO']);
export type FuenteTipoCambio = z.infer<typeof fuenteEnum>;

/** Fuentes admitidas (deben coincidir con las del backend). */
export const FUENTES_TIPO_CAMBIO: ReadonlyArray<{ value: FuenteTipoCambio; label: string }> = [
  { value: 'SUNAT', label: 'SUNAT' },
  { value: 'RPP', label: 'RPP' },
  { value: 'EL COMERCIO', label: 'EL COMERCIO' },
];

/** Decimal positivo con hasta 4 decimales (`compra`/`venta` son VARCHAR con el monto). */
const decimal4Schema = z
  .string()
  .trim()
  .regex(/^\d{1,10}(\.\d{1,4})?$/, 'Use números con hasta 4 decimales (p. ej. 3.745).')
  .refine((value) => Number(value) > 0, 'Debe ser mayor que cero.');

/** Formulario de tipo de cambio (un registro por fecha → 422 del backend). */
export const tipoCambioSchema = z.object({
  fuente: fuenteEnum,
  compra: decimal4Schema,
  venta: decimal4Schema,
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Seleccione la fecha.'),
});

export type TipoCambioInput = z.infer<typeof tipoCambioSchema>;
