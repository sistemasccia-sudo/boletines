import axios, { AxiosError } from 'axios';

import { clearToken, getToken } from '@/lib/auth';

/** Estructura de error devuelta por la API: { error: { message, fields } }. */
export interface ApiErrorBody {
  error?: {
    message?: string;
    fields?: Record<string, string>;
  };
}

/** Cliente HTTP único de la aplicación (único punto de acceso a la API). */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api/v1',
  headers: { Accept: 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiErrorBody>) => {
    const status = error.response?.status;
    const requestUrl = error.config?.url ?? '';

    // Sesión inválida o expirada: limpiar token y volver al login.
    if (status === 401 && !requestUrl.includes('/auth/login')) {
      clearToken();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  },
);

/** Devuelve un mensaje amigable en español para cualquier error de la API. */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    const fields = error.response?.data?.error?.fields;
    if (fields) {
      const firstField = Object.values(fields)[0];
      if (firstField) {
        return firstField;
      }
    }

    const message = error.response?.data?.error?.message;
    if (message) {
      return message;
    }

    if (error.code === 'ECONNABORTED') {
      return 'El servidor tardó demasiado en responder. Intente de nuevo.';
    }
    if (!error.response) {
      return 'No se pudo conectar con el servidor. Verifique su conexión.';
    }
  }

  return 'Ocurrió un error inesperado. Intente de nuevo.';
}

/** Devuelve los errores por campo (`fields` de una respuesta 422), si los hay. */
export function getApiFields(error: unknown): Record<string, string> {
  if (axios.isAxiosError<ApiErrorBody>(error)) {
    return error.response?.data?.error?.fields ?? {};
  }

  return {};
}
