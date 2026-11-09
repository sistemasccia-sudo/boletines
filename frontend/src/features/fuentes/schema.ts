import { z } from 'zod';

/** Formulario de fuente de información (el código lo genera el servidor). */
export const fuenteSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'Ingrese el nombre de la fuente.')
    .max(255, 'Máximo 255 caracteres.'),
});

export type FuenteInput = z.infer<typeof fuenteSchema>;
