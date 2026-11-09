/**
 * Normaliza la URL de un enlace del editor.
 * Solo se permiten `http://`, `https://`, `mailto:`, rutas internas (`/…`)
 * y anclas (`#…`); cualquier otro protocolo (`javascript:`, `data:`, …)
 * se rechaza. Un dominio sin protocolo recibe `https://`.
 *
 * @returns la URL válida o `null` si no se puede usar.
 */
export function normalizeLinkUrl(raw: string): string | null {
  const url = raw.trim();
  if (url === '') {
    return null;
  }
  if (/^(https?:\/\/|mailto:)/i.test(url)) {
    return url;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(url)) {
    return null;
  }
  if (/^[/?#]/.test(url)) {
    return url;
  }
  return `https://${url}`;
}
