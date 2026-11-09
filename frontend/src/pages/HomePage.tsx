import { Mail, Newspaper, Scale } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const modules = [
  {
    to: '/noticias',
    title: 'Bol. Noticias',
    description: 'Noticias, artículos, portadas, tipo de cambio, orden del día, obituarios y fuentes.',
    icon: Newspaper,
  },
  {
    to: '/legal',
    title: 'Bol. Legal',
    description: 'Publicación de normas legales con cuerpo, fecha y norma aplicada.',
    icon: Scale,
  },
  {
    to: '/cartas',
    title: 'Cartas',
    description: 'Registro de cartas con código correlativo, remitente, destinatario y asunto.',
    icon: Mail,
  },
] as const;

/** Página principal: grid de módulos. */
export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Seleccione un módulo</h1>
        <p className="text-sm text-muted-foreground">
          Gestione el boletín editorial desde una de las tres secciones disponibles.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map(({ to, title, description, icon: Icon }) => (
          <Link key={to} to={to} className="group focus-visible:outline-none">
            <Card className="h-full transition-colors group-hover:border-primary/40 group-hover:shadow-md group-focus-visible:ring-2 group-focus-visible:ring-ring">
              <CardHeader>
                <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Icon className="h-6 w-6" aria-hidden="true" />
                </div>
                <CardTitle className="text-xl">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
