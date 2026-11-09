/* eslint-disable react-refresh/only-export-components -- exporta Provider + hook de contexto */
import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api';
import { clearToken, getToken, setToken } from '@/lib/auth';

export interface User {
  id: number;
  nombres: string;
  apellidos: string;
  usuario: string;
  cargo: string | null;
}

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (usuario: string, password: string) => Promise<User>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const ME_QUERY_KEY = ['auth', 'me'] as const;

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const hasToken = getToken() !== null;

  const meQuery = useQuery({
    queryKey: ME_QUERY_KEY,
    queryFn: async (): Promise<User> => {
      const { data } = await api.get<{ user: User }>('/auth/me');
      return data.user;
    },
    enabled: hasToken,
    staleTime: 5 * 60_000,
    retry: false,
  });

  const value = useMemo<AuthContextValue>(
    () => ({
      user: meQuery.data ?? null,
      isAuthenticated: meQuery.data !== undefined,
      isLoading: hasToken && meQuery.isLoading,
      login: async (usuario: string, password: string): Promise<User> => {
        const { data } = await api.post<{ token: string; user: User }>('https://gestionccia.camara-arequipa.org.pe/backend//auth/login', {
          usuario,
          password,
        });
        setToken(data.token);
        queryClient.setQueryData(ME_QUERY_KEY, data.user);
        return data.user;
      },
      logout: () => {
        clearToken();
        queryClient.clear();
      },
    }),
    [hasToken, meQuery.data, meQuery.isLoading, queryClient],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === null) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return context;
}
