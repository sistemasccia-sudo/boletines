import { Mail } from 'lucide-react';

import CartasPage from '@/features/cartas/Page';

/** Módulo Cartas (sección única; la tabla vive en `features/cartas`). */
export default function CartasModulePage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Mail className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Cartas</h1>
      </div>
      <CartasPage />
    </div>
  );
}
