import { z } from 'zod';

/** true si el HTML tiene contenido real (texto o imagen), no solo etiquetas. */
export function hasRichContent(html: string): boolean {
  const text = html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim();
  return text.length > 0 || /<img\b/i.test(html);
}

/** Fecha vacía (hoy la pone el servidor) o ISO. */
const fechaOptionalSchema = z
  .string()
  .refine(
    (value) => value === '' || /^\d{4}-\d{2}-\d{2}$/.test(value),
    'Ingrese una fecha válida (AAAA-MM-DD).',
  );

/** Formulario de artículo (react-hook-form + Zod). */
export const articuloSchema = z.object({
  titulo: z.string().trim().min(1, 'Ingrese el título.').max(255, 'Máximo 255 caracteres.'),
  bajada: z.string().max(255, 'Máximo 255 caracteres.'),
  cuerpo: z.string().refine(hasRichContent, 'El cuerpo es obligatorio.'),
  fecha: fechaOptionalSchema,
  imagen: z.instanceof(File).nullable(),
});

export type ArticuloFormValues = z.infer<typeof articuloSchema>;

/** Payload JSON que espera la API (imagen = ruta relativa ya procesada o null). */
export interface ArticuloInput {
  titulo: string;
  bajada: string;
  cuerpo: string;
  fecha: string;
  /** Clave presente ⇒ cambia/elimina la imagen; ausente ⇒ no se toca. */
  imagen?: string | null;
}
