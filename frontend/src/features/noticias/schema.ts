import { z } from 'zod';

/** Tipos de noticia (`tnoticia.tipo`): 1..4. */
export const TIPOS_NOTICIA = [
  { value: '1', label: 'Local' },
  { value: '2', label: 'Nacional' },
  { value: '3', label: 'Internacional' },
  { value: '4', label: 'Informe económico' },
] as const;

const tipoEnum = z.enum(['1', '2', '3', '4']);
export type TipoNoticia = z.infer<typeof tipoEnum>;

/** Normaliza el valor legacy (puede venir null/vacío) para el select. */
export function normalizeTipo(tipo: string | null | undefined): TipoNoticia {
  return tipo === '1' || tipo === '2' || tipo === '3' || tipo === '4' ? tipo : '1';
}

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

/** Formulario de noticia (react-hook-form + Zod). */
export const noticiaSchema = z.object({
  titulo: z.string().trim().min(1, 'Ingrese el título.').max(2000, 'Máximo 2000 caracteres.'),
  bajada: z.string().max(2000, 'Máximo 2000 caracteres.'),
  cuerpo: z.string().refine(hasRichContent, 'El cuerpo es obligatorio.'),
  tipo: tipoEnum,
  fuente_codigo: z.string().max(50),
  fecha: fechaOptionalSchema,
  mostrar_en_web: z.boolean(),
  imagen: z.instanceof(File).nullable(),
});

export type NoticiaFormValues = z.infer<typeof noticiaSchema>;

/** Payload JSON que espera la API (imagen = ruta relativa ya procesada o null). */
export interface NoticiaInput {
  titulo: string;
  bajada: string;
  cuerpo: string;
  tipo: TipoNoticia;
  fuente_codigo: string;
  fecha: string;
  mostrar_en_web: boolean;
  /** Clave presente ⇒ cambia/elimina la imagen; ausente ⇒ no se toca. */
  imagen?: string | null;
}
