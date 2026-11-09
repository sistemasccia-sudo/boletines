import { describe, expect, it } from 'vitest';

import { cn } from '@/lib/utils';

describe('cn', () => {
  it('concatena clases simples', () => {
    expect(cn('a', 'b')).toBe('a b');
  });

  it('omite valores falsy', () => {
    expect(cn('a', false && 'b', undefined, null)).toBe('a');
  });

  it('resuelve conflictos de Tailwind (última gana)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});
