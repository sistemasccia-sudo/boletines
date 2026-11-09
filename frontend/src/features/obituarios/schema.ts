import { z } from 'zod';

/** Formulario de obituario (fecha y campos legacy no se editan). */
export const obituarioSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, 'Ingrese el nombre.')
    .max(180, 'Máximo 180 caracteres.'),
  descripcion: z
    .string()
    .trim()
    .min(1, 'Ingrese la descripción.')
    .max(5000, 'Máximo 5000 caracteres.'),
});

export type ObituarioInput = z.infer<typeof obituarioSchema>;
