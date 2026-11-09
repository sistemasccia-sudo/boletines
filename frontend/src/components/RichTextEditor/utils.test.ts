import { describe, expect, it } from 'vitest';

import { normalizeLinkUrl } from '@/components/RichTextEditor/utils';

describe('normalizeLinkUrl', () => {
  it('acepta URLs http/https y mailto tal cual', () => {
    expect(normalizeLinkUrl('https://ejemplo.com')).toBe('https://ejemplo.com');
    expect(normalizeLinkUrl('http://ejemplo.com')).toBe('http://ejemplo.com');
    expect(normalizeLinkUrl('HTTPS://EJEMPLO.COM')).toBe('HTTPS://EJEMPLO.COM');
    expect(normalizeLinkUrl('mailto:redaccion@ejemplo.com')).toBe('mailto:redaccion@ejemplo.com');
  });

  it('acepta rutas y anclas internas', () => {
    expect(normalizeLinkUrl('/noticias/12')).toBe('/noticias/12');
    expect(normalizeLinkUrl('#seccion')).toBe('#seccion');
  });

  it('agrega https:// a dominios sin protocolo', () => {
    expect(normalizeLinkUrl('www.ejemplo.com')).toBe('https://www.ejemplo.com');
    expect(normalizeLinkUrl('  ejemplo.com  ')).toBe('https://ejemplo.com');
  });

  it('rechaza protocolos peligrosos u otros', () => {
    expect(normalizeLinkUrl('javascript:alert(1)')).toBeNull();
    expect(normalizeLinkUrl('JAVASCRIPT:alert(1)')).toBeNull();
    expect(normalizeLinkUrl('data:text/html,<b>x</b>')).toBeNull();
    expect(normalizeLinkUrl('ftp://ejemplo.com')).toBeNull();
  });

  it('rechaza valores vacíos', () => {
    expect(normalizeLinkUrl('')).toBeNull();
    expect(normalizeLinkUrl('   ')).toBeNull();
  });
});
