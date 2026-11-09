import { QueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';

/**
 * Configuración global de React Query:
 * - staleTime de 60 s para que las tablas no refresquen sin necesidad.
 * - Sin reintentos ante errores 4xx (son errores de validación/sesión).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof AxiosError && error.response && error.response.status < 500) {
          return false;
        }
        return failureCount < 2;
      },
    },
  },
});
