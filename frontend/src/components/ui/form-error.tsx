import { cn } from '@/lib/utils';

/** Alerta de error mostrada en formularios. */
export function FormError({ message, className }: { message?: string; className?: string }) {
  if (!message) {
    return null;
  }

  return (
    <div
      role="alert"
      className={cn(
        'rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive',
        className,
      )}
    >
      {message}
    </div>
  );
}
