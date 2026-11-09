# Boletín · Gestión editorial

Modernización del software legacy de gestión editorial: **SPA en React** + **API REST en PHP** sobre una **base de datos MySQL existente**.

Módulos: **Bol. Noticias**, **Bol. Legal** y **Cartas** (todos requieren login).

## Requisitos

| Componente | Versión |
|---|---|
| PHP | 8.1+ con extensiones `pdo_mysql` y `gd` (gd se usa desde la Fase 3) |
| Composer | 2.x |
| MySQL | 5.7 / 8.0 (base de datos existente, administrada con phpMyAdmin) |
| Node.js | 18+ |
| npm | 9+ |

## Estructura

```
/
├── AGENTS.md
├── docs/schema.sql          # esquema real de la BD
├── backend/
│   ├── public/index.php     # front controller
│   ├── public/uploads/      # imágenes subidas (fuera de git)
│   ├── src/                 # Core, Controllers, Repositories, Middleware
│   ├── config/              # rutas y CORS
│   ├── migrations/          # scripts SQL (revisar y ejecutar manualmente)
│   ├── storage/             # rate limiting (fuera de git)
│   └── .env.example
└── frontend/                # Vite + React + TypeScript
```

## Backend (API REST)

```bash
cd backend
cp .env.example .env        # completar credenciales de BD y JWT_SECRET
composer install
php -S localhost:8000 -t public public/router.php
```

> `public/router.php` es el reescritor para el servidor de desarrollo (equivalente al `.htaccess` de Apache): sin él, `/api/v1/...` responde 404 en `php -S`.

- **Autenticación:** JWT (HS256) en el header `Authorization: Bearer <token>`, con vida configurable (`JWT_TTL_MINUTES`, por defecto 60 min). No se usan cookies de sesión.
- **CORS:** restringido al origen exacto de `CORS_ORIGIN` en `.env`.
- **Login:** acepta los hashes legacy **MD5 o SHA1** de la tabla `usuarios`; tras el primer login la contraseña se re-hashea automáticamente con `password_hash()` (bcrypt). Incluye bloqueo temporal por intentos (`LOGIN_MAX_ATTEMPTS` / `LOGIN_WINDOW_MINUTES`).
- **Formato de errores:** `{ "error": { "message": "...", "fields": { ... } } }`.

### Endpoints (resumen)

Prefijo `/api/v1`; todos, salvo `POST /auth/login`, requieren `Authorization: Bearer`.

| Método | Ruta | Uso |
|---|---|---|
| POST | `/auth/login` | devuelve el JWT |
| GET | `/auth/me` | usuario del token |
| GET | `/{recurso}` | listado paginado (`?page&pageSize&sort&order` + filtros por campo) |
| POST | `/{recurso}` | creación |
| GET | `/{recurso}/{id}` | detalle (incluye `cuerpo` en noticias/artículos y Bol. Legal) |
| PATCH · PUT | `/{recurso}/{id}` | actualización |
| DELETE | `/{recurso}/{id}` | eliminación (borra también sus imágenes) |
| POST | `/uploads` | subida de imagen, `multipart/form-data` con `archivo` y `contexto` |
| GET | `/cartas/siguiente-codigo` | código correlativo `NNN-AAAA` del año actual |

- Recursos: `fuentes`, `noticias`, `articulos`, `portadas`, `tipo-cambio`, `obituarios`, `legal`, `cartas`.
- Filtros disponibles según recurso: `titulo`, `norma_legal`, `nombre`, `descripcion`, `fuente`, `tipo`, `fecha_desde`/`fecha_hasta`, `codigo`, `remitente`, `destinatario`, `asunto`, etc.
- **Cartas:** el código se guarda partido (`codigo` + `anio`) y se sirve compuesto (`571-2026`, con ceros a la izquierda); un código por año (migración 003) y, si se repite, 422 con el siguiente disponible sugerido. La tabla incluye la columna **`usuario`** con quien registró la carta (`JOIN` con `usuarios`).
- **Bol. Legal:** mapea `titular` → título y `bajada` → norma legal; el listado no trae `cuerpo` (rendimiento), solo el detalle.
- **Imágenes:** `POST /uploads` valida el MIME real, convierte a WebP, redimensiona y genera la miniatura; devuelve `{ path, thumb_path, url, thumb_url }` y `contexto` ∈ `editor | noticias | articulos | portadas`. En la BD solo se guarda la ruta relativa (`uploads/…webp`); la miniatura se deriva por nombre (`{base}_thumb.webp`), sin columnas extra.
- `PATCH` es alias de `PUT` (el frontend lo usa para actualizaciones parciales).
- **Cambiar orden:** `GET /noticias/orden` lista las noticias del día (America/Lima) y `POST /noticias/orden/intercambiar` con `{ "ids": [a, b] }` troca su posición en una transacción (requiere la migración 001). Ambos aceptan `?tipo=1..4`; la UI filtra por tipo con valor por defecto `1` (local).

### Migraciones SQL

Los scripts de `/backend/migrations` **no se ejecutan solos**: revísalos en phpMyAdmin y ejecútalos cuando estés listo. Cada uno incluye su reversa comentada.

| Script | Fase | Contenido |
|---|---|---|
| `001_tnoticia_orden.sql` | 4 | columna `orden` + índice `(fecha, orden)` en `tnoticia` |
| `002_tcambio_decimals.sql` | 3 | **Anulada (no ejecutar)**: se mantiene `VARCHAR` (la fuente vive en su propia columna; formato confirmado en producción) |
| `003_cartas_codigo_unico.sql` | 5 | UNIQUE (codigo, anio) en `cartas` |
| `004_imagenes_thumb.sql` | 3 | **No necesaria**: la miniatura se guarda como archivo `{base}_thumb.webp` (sin columna) |
| `005_indices_listados.sql` | 6 | índices de listados (estado + fecha) |
| `006_charset_utf8mb4.sql` | 6 (opcional) | conversión de tablas latin1 → utf8mb4 |
| `008_tcambio_fecha_unica.sql` | 3 | UNIQUE (fecha) en `tcambio` — un registro de tipo de cambio por fecha |

> La migración 001 debe ejecutarse **antes** de usar la pestaña "Cambiar orden de noticias" (Fase 4).

## Frontend (SPA)

```bash
cd frontend
cp .env.example .env
npm install
npm run dev          # http://localhost:5173
```

En desarrollo, Vite hace proxy de `/api` a `http://localhost:8000` (no hace falta configurar CORS). En producción, `VITE_API_BASE_URL` debe apuntar a la URL real de la API.

Tras el login, la página principal muestra el grid de módulos. **Bol. Noticias** tiene pestañas anidadas, cada una con su URL propia: `/noticias/noticias`, `/noticias/articulos`, `/noticias/portadas`, `/noticias/tipo-cambio`, `/noticias/orden`, `/noticias/obituarios` y `/noticias/fuentes`.

```bash
npm run build        # genera dist/ (subir al servidor web del frontend)
npm run lint
npm run test
```

### Prueba de humo del backend (opcional)

Con el servidor local levantado y `APP_ENV=local` en `backend/.env` (recrea datos de prueba):

```bash
cd backend && php smoke.php   # CRUD de los 6 módulos + uploads: 61 comprobaciones
```

## Despliegue

1. **Backend:** subir `backend/` al servidor (excepto `.env` y `storage/`), crear `.env` con credenciales reales, ejecutar `composer install --no-dev` y apuntar el virtual host a `backend/public/`. Configurar `CORS_ORIGIN` con la URL exacta del frontend.
2. **Frontend:** `npm run build` y servir `frontend/dist/` con cualquier servidor estático (Nginx, Apache). Configurar `VITE_API_BASE_URL` antes de compilar si la API no está en el mismo dominio.
3. **Base de datos:** ejecutar los scripts de `backend/migrations` revisados, en el orden indicado.

### Despliegue en cPanel (subdominio)

Ejemplo con el subdominio `gestionccia.camara-arequipa.org.pe`:

1. Subir la carpeta `backend/` completa (incluye `vendor/`, pero **sin** el `.env` local) a, p. ej., `public_html/gestionccia.camara-arequipa.org.pe/backend/`.
2. En **cPanel → Subdominios**, poner el *Document Root* del subdominio en la carpeta `backend/public` (no en la carpeta que la contiene). Sin esto, `/api/v1/...` responde 404.
3. Crear `backend/.env` en el servidor con las credenciales reales de MySQL (`DB_HOST` normalmente `localhost`), un `JWT_SECRET` nuevo y `CORS_ORIGIN` (p. ej. `http://localhost:5173` mientras se pruebe desde el frontend local).
4. Seleccionar PHP 8.1+ con la extensión `pdo_mysql` (cPanel → Select PHP Version) y dar permisos de escritura a `storage/` y `public/uploads/`.
5. Activar AutoSSL en el subdominio.

Comprobar que la API responde abriendo `https://gestionccia.camara-arequipa.org.pe/api/v1/auth/me`: debe devolver `401` en JSON (no 404 ni 500).

Para probar el frontend local contra esa API, crear `frontend/.env` y reiniciar `npm run dev`:

```
VITE_API_BASE_URL=https://gestionccia.camara-arequipa.org.pe/api/v1
```

> Nota: `backend/public/.htaccess` es obligatorio en Apache/cPanel: sin él, las rutas `/api/v1/...` no llegan a `index.php`.

## Convenciones

- Interfaz en español; código, variables y commits en inglés.
- Todas las consultas usan PDO con consultas preparadas (`ATTR_EMULATE_PREPARES = false`).
- Listados paginados en el servidor: `{ data: [...], meta: { page, pageSize, total } }`.
# boletines
