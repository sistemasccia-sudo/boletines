import { Navigate, Outlet } from 'react-router-dom';

import { PageSkeleton } from '@/components/ui/page-skeleton';
import { useAuth } from '@/features/auth/AuthProvider';

/** Protege todas las rutas hijas: exige sesión iniciada. */
export function ProtectedRoute() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
