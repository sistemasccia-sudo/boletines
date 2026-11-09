import { Scale } from 'lucide-react';

import LegalPage from '@/features/legal/Page';

/** Módulo Bol. Legal (sección única; la tabla vive en `features/legal`). */
export default function LegalModulePage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Scale className="h-5 w-5" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Bol. Legal</h1>
      </div>
      <LegalPage />
    </div>
  );
}
