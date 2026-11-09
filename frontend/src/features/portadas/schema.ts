import { z } from 'zod';

/** Fecha de hoy en zona horaria America/Lima (AAAA-MM-DD). */
export function todayInLima(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
}

/**
 * Formulario de portada: solo se sube una imagen (obligatoria) para una fecha.
 * El backend la convierte a WebP y genera la miniatura.
 */
export const portadaSchema = z.object({
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Seleccione la fecha.'),
  // Retorno `boolean` explícito: sin él, TS 5.5 infiere un type predicate y
  // Zod estrecharía la salida a `File` (el formulario necesita `File | null`).
  imagen: z
    .instanceof(File)
    .nullable()
    .refine((file): boolean => file !== null, 'Seleccione una imagen de portada.'),
});

export type PortadaFormValues = z.infer<typeof portadaSchema>;

/** Payload JSON que espera la API (`archivo` = ruta relativa ya procesada). */
export interface PortadaInput {
  fecha: string;
  archivo: string;
}
