import * as React from 'react';

import { cn } from '@/lib/utils';

export type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement>;

/**
 * Checkbox nativo con estilo (sin dependencias extra). Uso con react-hook-form:
 * `<Checkbox id="x" {...register('campo')} />`.
 */
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type ?? 'checkbox'}
    className={cn(
      'h-4 w-4 shrink-0 rounded border border-input accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50',
      className,
    )}
    {...props}
  />
));
Checkbox.displayName = 'Checkbox';

export { Checkbox };
