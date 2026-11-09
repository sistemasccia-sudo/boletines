import { Newspaper } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';

import { cn } from '@/lib/utils';

const TABS = [
  { to: '/noticias/noticias', label: 'Noticias' },
  { to: '/noticias/articulos', label: 'Artículos' },
  { to: '/noticias/portadas', label: 'Portadas' },
  { to: '/noticias/tipo-cambio', label: 'Tipo de cambio' },
  { to: '/noticias/orden', label: 'Cambiar orden' },
  { to: '/noticias/obituarios', label: 'Obituarios' },
  { to: '/noticias/fuentes', label: 'Fuentes de información' },
] as const;

/** Módulo Bol. Noticias: cabecera con pestañas anidadas (cada una con URL propia). */
export default function NoticiasModulePage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 p-4 sm:p-6">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Newspaper className="h-6 w-6 text-primary" aria-hidden="true" />
          Bol. Noticias
        </h1>
        <p className="text-sm text-muted-foreground">
          Noticias, artículos, portadas, tipo de cambio, orden del día, obituarios y fuentes.
        </p>
      </div>

      <nav aria-label="Secciones de Bol. Noticias" className="border-b">
        <div className="-mb-px flex flex-wrap gap-1">
          {TABS.map((tab) => (
            <NavLink
              key={tab.to}
              to={tab.to}
              end
              className={({ isActive }) =>
                cn(
                  'border-b-2 px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                )
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <Outlet />
    </div>
  );
}
