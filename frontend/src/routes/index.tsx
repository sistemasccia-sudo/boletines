import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';

import { AppLayout } from '@/components/layout/AppLayout';
import { PageSkeleton } from '@/components/ui/page-skeleton';
import { ProtectedRoute } from '@/routes/ProtectedRoute';

// Lazy loading por módulo (rendimiento).
const HomePage = lazy(() => import('@/pages/HomePage'));
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'));
const NoticiasModulePage = lazy(() => import('@/routes/modules/NoticiasModulePage'));
const LegalModulePage = lazy(() => import('@/routes/modules/LegalModulePage'));
const CartasModulePage = lazy(() => import('@/routes/modules/CartasModulePage'));
const ComponentesDemoPage = lazy(() => import('@/pages/ComponentesDemoPage'));

// Pestañas del módulo Bol. Noticias (rutas anidadas, cada una con URL propia).
const NoticiasPage = lazy(() => import('@/features/noticias/Page'));
const ArticulosPage = lazy(() => import('@/features/articulos/Page'));
const PortadasPage = lazy(() => import('@/features/portadas/Page'));
const TipoCambioPage = lazy(() => import('@/features/tipo-cambio/Page'));
const OrdenNoticiasPage = lazy(() => import('@/features/orden-noticias/Page'));
const ObituariosPage = lazy(() => import('@/features/obituarios/Page'));
const FuentesPage = lazy(() => import('@/features/fuentes/Page'));

export function AppRoutes() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/noticias" element={<NoticiasModulePage />}>
              <Route index element={<Navigate to="/noticias/noticias" replace />} />
              <Route path="noticias" element={<NoticiasPage />} />
              <Route path="articulos" element={<ArticulosPage />} />
              <Route path="portadas" element={<PortadasPage />} />
              <Route path="tipo-cambio" element={<TipoCambioPage />} />
              <Route path="orden" element={<OrdenNoticiasPage />} />
              <Route path="obituarios" element={<ObituariosPage />} />
              <Route path="fuentes" element={<FuentesPage />} />
            </Route>
            <Route path="/legal" element={<LegalModulePage />} />
            <Route path="/cartas" element={<CartasModulePage />} />
            <Route path="/demo" element={<ComponentesDemoPage />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
