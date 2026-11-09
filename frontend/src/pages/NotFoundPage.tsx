import { Link } from 'react-router-dom';

import { buttonVariants } from '@/components/ui/button';

/** Página 404. */
export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4 text-center">
      <p className="text-6xl font-semibold tracking-tight">404</p>
      <p className="text-muted-foreground">La página solicitada no existe.</p>
      <Link to="/" className={buttonVariants()}>
        Volver al inicio
      </Link>
    </div>
  );
}
