import { describe, expect, it } from 'vitest';

import { buildListParams } from '@/lib/crud';

describe('buildListParams', () => {
  it('siempre incluye paginación', () => {
    expect(buildListParams({ page: 2, pageSize: 20 })).toEqual({ page: 2, pageSize: 20 });
  });

  it('incluye sort/order solo si hay campo de orden y usa asc por defecto', () => {
    expect(buildListParams({ page: 1, pageSize: 10, sort: 'codigo' })).toEqual({
      page: 1,
      pageSize: 10,
      sort: 'codigo',
      order: 'asc',
    });

    expect(buildListParams({ page: 1, pageSize: 10, sort: 'fecha', order: 'desc' }).order).toBe('desc');
  });

  it('aplica filtros con valor', () => {
    const params = buildListParams({
      page: 1,
      pageSize: 10,
      filters: { codigo: '571', remitente: 'muni' },
    });

    expect(params.codigo).toBe('571');
    expect(params.remitente).toBe('muni');
  });

  it('descarta filtros vacíos o solo en blanco', () => {
    const params = buildListParams({
      page: 1,
      pageSize: 10,
      filters: { codigo: '', remitente: '   ', asunto: 'x' },
    });

    expect(params).not.toHaveProperty('codigo');
    expect(params).not.toHaveProperty('remitente');
    expect(params.asunto).toBe('x');
  });

  it('recorta los valores de filtro', () => {
    expect(buildListParams({ page: 1, pageSize: 10, filters: { asunto: '  saludo  ' } }).asunto).toBe('saludo');
  });
});
