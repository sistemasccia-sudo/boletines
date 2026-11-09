import { z } from 'zod';

/** Formulario de carta: código NNN-AAAA + remitente + destinatario + asunto. */
export const cartaSchema = z.object({
  codigo: z
    .string()
    .trim()
    .regex(/^\d{1,9}-\d{4}$/, 'Formato: NNN-AAAA (p. ej. 571-2026).'),
  remitente: z.string().trim().min(1, 'Ingrese el remitente.').max(100, 'Máximo 100 caracteres.'),
  destinatario: z
    .string()
    .trim()
    .min(1, 'Ingrese el destinatario.')
    .max(100, 'Máximo 100 caracteres.'),
  asunto: z.string().trim().min(1, 'Ingrese el asunto.').max(255, 'Máximo 255 caracteres.'),
});

export type CartaInput = z.infer<typeof cartaSchema>;
