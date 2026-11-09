import { z } from 'zod';

/** Fecha ISO de hoy en la zona horaria America/Lima. */
export function hoyLima(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Lima' }).format(new Date());
}

/** Formulario de norma legal (react-hook-form + Zod). */
export const legalSchema = z.object({
  titulo: z.string().trim().min(1, 'Ingrese el título.').max(2000, 'Máximo 2000 caracteres.'),
  norma_legal: z
    .string()
    .trim()
    .min(1, 'Ingrese la norma legal.')
    .max(2000, 'Máximo 2000 caracteres.'),
  // Cuerpo opcional (TipTap puede dejar `<p></p>` si no se escribe nada).
  cuerpo: z.string().max(500000, 'Máximo 500000 caracteres.'),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Seleccione la fecha.'),
});

export type LegalInput = z.infer<typeof legalSchema>;
