import { Loader2 } from 'lucide-react';
import type { FormEvent, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormError } from '@/components/ui/form-error';

export interface FormDialogProps {
  open: boolean;
  /** Ancho extendido (max-w-3xl) y altura máxima 90vh con scroll: formularios con editor. */
  wide?: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  /** Envío en curso (RHF `isSubmitting`): bloquea guardar y cierra. */
  isSubmitting?: boolean;
  /** Bloquea solo «Guardar» (p. ej. mientras carga el detalle a editar). */
  disableSubmit?: boolean;
  /** Error general del servidor (422 sin campos / 500 / red). */
  serverError?: string;
  submitLabel?: string;
  children: ReactNode;
}

/**
 * Modal genérico de creación/edición: envuelve un `<form>` con react-hook-form
 * + Zod, error general del servidor y botones Cancelar/Guardar.
 * Se usa desde el Form de cada feature (no se duplica entre módulos).
 */
export function FormDialog({
  open,
  wide = false,
  title,
  description,
  onClose,
  onSubmit,
  isSubmitting = false,
  disableSubmit = false,
  serverError,
  submitLabel = 'Guardar',
  children,
}: FormDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSubmitting) {
          onClose();
        }
      }}
    >
      {/* `wide`: ancho extendido y tope de 90vh con scroll interno (twMerge reemplaza los defaults). */}
      <DialogContent className={wide ? 'max-h-[90vh] sm:max-w-3xl' : undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? <DialogDescription>{description}</DialogDescription> : null}
        </DialogHeader>

        <form onSubmit={onSubmit} noValidate className="space-y-4">
          <FormError message={serverError} />
          {children}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || disableSubmit}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
