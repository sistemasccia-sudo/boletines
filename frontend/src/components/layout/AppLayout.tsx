import { Home, LogOut } from 'lucide-react';
import { Outlet, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/button';
import { useAuth } from '@/features/auth/AuthProvider';

/** Layout general: cabecera con usuario y contenido de la ruta activa. */
export function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-card">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href="/" className="text-lg font-semibold tracking-tight">
            Boletín · Gestión editorial
          </a>

          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              aria-label="Volver al menú principal"
              title="Menú principal"
            >
              <Home className="h-4 w-4" />
            </Button>
            {user && (
              <span className="hidden text-sm text-muted-foreground sm:inline">
                {user.nombres} {user.apellidos}
                {user.cargo ? ` · ${user.cargo}` : ''}
              </span>
            )}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
}
