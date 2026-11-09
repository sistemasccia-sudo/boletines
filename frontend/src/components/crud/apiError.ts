import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';

import { getApiErrorMessage, getApiFields } from '@/lib/api';

/**
 * Crea el manejador de errores de API para un formulario con react-hook-form:
 * - `fields` de una respuesta 422 → errores por input (renombrados con `aliases`,
 *   p. ej. el campo `archivo` de la subida → `imagen` del formulario);
 * - resto (500, red, etc.) → mensaje general del servidor.
 *
 * Uso: `const handleApiError = createApiErrorHandler<FormValues>(setError, setServerError);`
 */
export function createApiErrorHandler<T extends FieldValues>(
  setError: UseFormSetError<T>,
  setServerError: (message: string | undefined) => void,
  aliases: Record<string, string> = {},
): (error: unknown) => void {
  return (error: unknown) => {
    const entries = Object.entries(getApiFields(error));

    if (entries.length === 0) {
      setServerError(getApiErrorMessage(error));
      return;
    }

    for (const [field, message] of entries) {
      setError((aliases[field] ?? field) as Path<T>, { type: 'server', message });
    }
  };
}
