# AGENTS.md

Guía permanente para agentes de código en este repositorio. Léela completa antes de escribir código.

## 1. Contexto del proyecto

Modernización de un software antiguo de gestión editorial. Se reemplaza la app legacy por:

- **Frontend:** SPA en React.
- **Backend:** API REST pequeña en PHP.
- **Base de datos:** MySQL **ya existente** (administrada con phpMyAdmin). No se crea desde cero.

Módulos del sistema (todos requieren login):

1. **Bol. Noticias** (pestañas: Noticias, Artículos, Portadas, Tipo de cambio, Cambiar orden de noticias, Obituarios, Fuentes de información)
2. **Bol. Legal**
3. **Cartas**

La página principal, tras iniciar sesión, muestra un **grid de tarjetas** para elegir el módulo.

## 2. Stack obligatorio

### Frontend (`/frontend`)
- React 18+ con **Vite** y **TypeScript**
- **React Router** (rutas protegidas)
- **TanStack Query (React Query)** para todo el acceso a datos
- **TanStack Table** para los data tables
- **React Hook Form + Zod** para formularios y validación
- **TipTap** como editor de texto enriquecido
- **Tailwind CSS + shadcn/ui** para UI
- **Axios** (o fetch con wrapper propio) con un único cliente en `src/lib/api.ts`

### Backend (`/backend`)
- **PHP 8.1+ sin framework pesado**: router propio mínimo (o Slim 4 si se justifica), **PDO** con consultas preparadas, Composer para dependencias.
- Autenticación con **JWT** (access token corto) enviado en header `Authorization: Bearer`, o sesión con cookie `HttpOnly; Secure; SameSite=Lax`. Elegir una y documentarla en el README.
- Sanitización de HTML del editor con **HTMLPurifier** (o equivalente) antes de guardar.

No agregar librerías fuera de esta lista sin justificarlo en el PR/commit.

## 3. Estructura del repositorio

```
/
├── AGENTS.md
├── README.md
├── backend/
│   ├── public/index.php          # front controller
│   ├── public/uploads/           # imágenes subidas (fuera de git)
│   ├── src/
│   │   ├── Core/                 # Router, Request, Response, Db, Auth, Validator
│   │   ├── Controllers/
│   │   ├── Repositories/         # SQL aquí, nunca en controllers
│   │   └── Middleware/           # AuthMiddleware, CorsMiddleware
│   ├── config/                   # env, cors
│   ├── .env.example
│   └── composer.json
└── frontend/
    ├── src/
    │   ├── lib/                  # api client, queryClient, utils
    │   ├── components/           # ui/, DataTable/, RichTextEditor/, layout/
    │   ├── features/
    │   │   ├── auth/
    │   │   ├── noticias/ articulos/ portadas/ tipo-cambio/
    │   │   ├── orden-noticias/ obituarios/ fuentes/
    │   │   ├── legal/
    │   │   └── cartas/
    │   └── routes/
    └── .env.example
```

Cada feature contiene: `api.ts` (llamadas), `hooks.ts` (React Query), `schema.ts` (Zod), `columns.tsx`, `Form.tsx`, `Page.tsx`.

## 4. Base de datos (REGLA CRÍTICA)

- La BD MySQL **ya existe y tiene datos reales**. **Nunca** ejecutes `DROP`, `TRUNCATE` ni `DELETE` masivos, ni cambios destructivos de esquema.
- Antes de codificar, **inspecciona el esquema real** (pide el dump `.sql` al usuario o lee `/docs/schema.sql`). No inventes nombres de tablas o columnas: usa los existentes y mapea a nombres limpios en la capa API si hace falta.
- Todo cambio de esquema (índices, columnas nuevas) se entrega como script en `/backend/migrations/NNN_descripcion.sql`, **aditivo y reversible**, para que el usuario lo revise y ejecute manualmente. Nunca lo apliques automáticamente.
- Credenciales solo en `.env` (nunca en git). Mantén `.env.example` actualizado.
- Si el sistema legacy guarda contraseñas con MD5/SHA1/texto plano: soportar ese hash **solo para validar el primer login** y re-hashear de inmediato con `password_hash()` (bcrypt/argon2).
- Usa `utf8mb4`. Fechas en formato ISO (`YYYY-MM-DD`) en la API.

## 5. Convenciones de la API

- REST, JSON, prefijo `/api/v1`.
- Recurso por módulo: `/noticias`, `/articulos`, `/portadas`, `/tipo-cambio`, `/obituarios`, `/fuentes`, `/legal`, `/cartas`, más `/auth/login`, `/auth/me`.
- Verbos: `GET` lista y detalle, `POST` crear, `PUT/PATCH` actualizar, `DELETE` eliminar.
- Respuesta de listado (siempre paginada **en servidor**):
  ```json
  { "data": [...], "meta": { "page": 1, "pageSize": 20, "total": 1234 } }
  ```
- Query params estándar de listados: `page`, `pageSize` (máx. 100), `sort`, `order` (`asc|desc`) y un filtro por cada campo (`?titulo=...&fecha_desde=...`).
- Errores: HTTP correcto (400/401/403/404/422/500) con `{ "error": { "message": "...", "fields": { "campo": "mensaje" } } }`.
- Todos los endpoints, excepto `/auth/login`, requieren autenticación.
- Subida de imágenes con `multipart/form-data`: validar MIME real (`finfo`), extensión permitida de entrada (jpg, jpeg, png, webp), tamaño máximo de entrada (configurable, p. ej. 10 MB), renombrar con nombre aleatorio, guardar fuera de rutas ejecutables, y guardar en BD solo la ruta relativa.

### Procesamiento de imágenes (obligatorio en TODA subida)

Centralizar en un único servicio `src/Core/ImageProcessor.php`, usado por todos los controllers (noticias, artículos, portadas e imágenes del editor). Nunca guardar el archivo original tal cual.

- Usar **GD** (`imagewebp`) o **Imagick** si está disponible; verificar la extensión al arrancar y fallar con un mensaje claro si falta soporte WebP.
- **Convertir siempre a WebP** (calidad configurable, por defecto 80).
- **Redimensionar** manteniendo proporción: ancho máximo configurable (por defecto 1600 px; 2000 px para portadas). Nunca ampliar imágenes pequeñas.
- **Corregir orientación EXIF** antes de procesar y **eliminar metadatos** (EXIF/GPS) del resultado.
- Preservar transparencia en PNG.
- Generar además una **miniatura** (por defecto 400 px de ancho, WebP) para usar en las tablas.
- Las dimensiones, calidad y tamaño máximo de entrada se leen de `.env` (`IMAGE_MAX_WIDTH`, `IMAGE_QUALITY`, `IMAGE_MAX_UPLOAD_MB`).
- Proteger contra "image bombs": rechazar imágenes con dimensiones de origen excesivas (p. ej. > 12000 px por lado) antes de decodificarlas, y verificar que `memory_limit` alcanza.
- Si el WebP resultante pesa más que el original ya optimizado, conservar el menor.
- Al eliminar o reemplazar un registro con imagen, borrar también el archivo y su miniatura del disco.
- Devolver en la respuesta la ruta de la imagen y de la miniatura.

### Texto enriquecido (rich text)

- Los campos del editor (cuerpo de noticias, artículos y Bol. Legal) se guardan en BD como **HTML** (con etiquetas), en columnas `MEDIUMTEXT` o `LONGTEXT` con `utf8mb4`.
- El backend **sanitiza** ese HTML con HTMLPurifier antes de guardar, con una **lista blanca** de etiquetas y atributos: `p, br, strong, em, u, s, h2, h3, h4, ul, ol, li, blockquote, a (href, target, rel), img (src, alt), table, thead, tbody, tr, th, td`. Se eliminan `script`, `style`, atributos `on*` y URLs `javascript:`. Los enlaces externos reciben `rel="noopener noreferrer"`.
- **Nunca incrustar imágenes en base64** dentro del HTML. Las imágenes insertadas desde el editor se suben con `POST /api/v1/uploads/editor`, pasan por `ImageProcessor` (WebP + compresión) y el editor inserta solo la URL devuelta. El sanitizador debe rechazar `src="data:..."`.
- El frontend renderiza este HTML únicamente tras haber sido sanitizado por el backend.
- Si la tabla legacy ya contiene HTML antiguo, **no reescribirlo masivamente**; solo sanitizar al editar y guardar.

## 6. Seguridad (no negociable)

- **Solo consultas preparadas** (PDO, `ATTR_EMULATE_PREPARES = false`). Prohibido concatenar input en SQL. Los nombres de columna para `sort` se validan contra una lista blanca.
- Sanitizar el HTML del editor enriquecido en el **backend** al guardar. Al mostrarlo en el frontend, renderizar solo contenido ya sanitizado.
- CORS restringido al origen del frontend configurado en `.env`.
- Rate limiting básico o bloqueo temporal en `/auth/login`.
- No exponer stack traces ni errores SQL al cliente; loguear en servidor.
- Validar siempre en backend, aunque el frontend ya valide con Zod.

## 7. Rendimiento (requisito explícito del usuario)

Los data tables deben cargar rápido:

- **Paginación, orden y filtros en el servidor.** Nunca traer tablas completas al cliente.
- Listados: `SELECT` solo de las columnas necesarias (no traer el cuerpo HTML completo en listados; solo en el detalle/edición).
- Debounce de **300 ms** en los inputs de filtro.
- React Query: `staleTime` razonable (p. ej. 30–60 s), `placeholderData: keepPreviousData` para paginación sin parpadeos, `queryKey` que incluya página, orden y filtros, e **invalidación** de la query del recurso tras crear/editar/eliminar.
- Prefetch de la página siguiente cuando sea barato.
- Proponer (en migración, sin aplicar) los índices necesarios sobre columnas filtradas/ordenadas (fechas, código, FK).
- Lazy loading de rutas (`React.lazy`) por módulo; el editor TipTap se carga solo donde se usa.
- Miniaturas o `loading="lazy"` en imágenes de las tablas.

## 8. Reglas de negocio específicas

### Noticias
- Campos: título (textarea), bajada (textarea), cuerpo (rich text), tipo (`local | nacional | internacional | informe economico`), fuente (FK a tabla de fuentes; el select se llena desde la BD), `mostrar_en_web` (checkbox, **`true` por defecto**), imagen (file).
- Debe existir un campo de orden para las noticias del día (ver "Cambiar orden"). Si no existe en el esquema, proponerlo vía migración.

### Artículos
- Título, bajada, cuerpo (rich text), imagen.

### Portadas
- Solo subir/listar/eliminar imagen de portada (con vista previa).

### Tipo de cambio
- Campos del formulario: fuente (`SUNAT | RPP | EL COMERCIO`), compra y venta (numéricos, positivos, hasta 4 decimales) y fecha (date).
- **Almacenamiento (confirmado por el usuario sobre la producción):** la tabla **SÍ tiene columna `fuente`** (allí se guarda la fuente seleccionada); `compra`/`venta` son `VARCHAR` y guardan **solo el monto** (p. ej. `3.745`). La API devuelve cada campo por separado. **No convertir a `DECIMAL`** sin confirmación (la migración `002` quedó anulada y se retiró el archivo).
- **Un registro por `fecha`**: duplicado → 422 con el error en `fecha` (índice UNIQUE vía migración `008` + chequeo previo en la API).

### Cambiar orden de noticias
- Solo noticias del **día actual** (zona horaria `America/Lima`).
- UI: el usuario selecciona **dos** noticias y pulsa "Intercambiar"; se intercambia su posición de orden.
- La lista se filtra por **tipo** (`?tipo=1..4` en `GET /noticias/orden`; select en la UI con valor por defecto `1` = local).
- El backend ejecuta el intercambio en **una transacción** (`SELECT ... FOR UPDATE`, swap del valor de orden/fecha-hora de publicación) y devuelve la lista actualizada.
- Rechazar si alguna noticia no es del día actual.

### Obituarios
- Nombre (text), descripción (textarea).

### Fuentes de información
- Nombre de referencia (text). Al eliminar una fuente en uso por noticias, **bloquear** y devolver un mensaje claro (no borrado en cascada).

### Bol. Legal
- Título (textarea), norma legal (textarea), cuerpo (rich text), fecha (date, **por defecto la fecha actual**).
- Nota: el campo se llama "norma legal" en la UI. En la API, **título** y **norma legal** son obligatorios; el **cuerpo** es opcional (si se envía vacío, se guarda NULL).
- **Mapeo a la BD (`normas_legales`):** `titular` ← título, `bajada` ← norma legal, `cuerpo` ← cuerpo (sanitizado con HTMLPurifier), `fecha` ← fecha. `fecha_especial` se crea igual a `fecha` (columna NOT NULL que el módulo no expone) y `estado` conserva su DEFAULT 1. El listado **no** trae `cuerpo` (rendimiento): solo el detalle.

### Cartas
- Campos: código, remitente, destinatario, asunto (textarea).
- **Código:** formato `NNN-AAAA` (ej. `571-2026`). Por defecto el formulario propone el siguiente código: `GET /cartas/siguiente-codigo` devuelve el consecutivo del año actual calculado desde el último código en BD (numérico, no por orden alfabético) y, si cambia el año, reinicia en `1`.
- Garantizar unicidad (índice UNIQUE vía migración propuesta) y manejar colisiones concurrentes: al guardar, si el código ya existe, devolver 422 con el siguiente disponible sugerido.
- **El data table debe tener un filtro de búsqueda por cada columna** (código, remitente, destinatario, asunto).
- **BD:** el código se guarda partido (`codigo` int + `anio` year) y se sirve compuesto (con ceros a la izquierda: `001-2026`); `idusuario` se toma del JWT (`sub`) y `fecha` su DEFAULT. El filtro `codigo` con forma `NNN-AAAA` hace coincidencia exacta. El listado y el detalle incluyen **`usuario`** = `nombres` + `apellidos` del registrante (`LEFT JOIN` con `usuarios`), y se muestra como columna en la tabla.

## 9. UI / UX

- Idioma de la interfaz: **español**. Código, variables y commits en inglés.
- Página principal: grid responsivo de 3 tarjetas (Bol. Noticias, Bol. Legal, Cartas) con ícono y descripción breve.
- Bol. Noticias: navegación por **pestañas** (rutas anidadas para que cada pestaña tenga URL propia).
- CRUD estándar en cada sección: tabla con paginación/orden/filtros, botón "Nuevo", crear/editar en modal o página, confirmación antes de eliminar, toasts de éxito/error, estados de carga (skeletons) y estados vacíos.
- Componente `DataTable` **genérico y reutilizable** (server-side) y `RichTextEditor` reutilizable. No duplicar código entre módulos.
- Accesible (labels, foco, teclado) y responsive.

## 10. Calidad de código

- TypeScript estricto (`strict: true`), sin `any` injustificado.
- Backend PHP con tipado estricto (`declare(strict_types=1);`), PSR-12, PSR-4 autoload.
- Linting/format: ESLint + Prettier (frontend), PHP-CS-Fixer o PHPCS (backend).
- Funciones y componentes pequeños; lógica de datos en hooks/repositories, no en componentes ni controllers.
- Sin código muerto, sin `console.log` ni `var_dump` en commits.
- Pruebas: Vitest + Testing Library para utilidades y formularios clave; PHPUnit para reglas críticas (código de cartas, intercambio de orden, validaciones, auth).

## 11. Forma de trabajo del agente

1. **Primero lee** el esquema de BD y este archivo; resume en pocas líneas tu plan antes de codificar.
2. Si falta información que bloquea (esquema, nombres de tablas, tipo de hash de contraseñas), **pregunta** en vez de suponer.
3. Trabaja **por fases** y deja el proyecto ejecutable al final de cada una (ver `PROMPT.md`).
4. Commits pequeños y descriptivos (Conventional Commits: `feat:`, `fix:`, `chore:`...).
5. No modifiques archivos fuera del alcance de la tarea ni reformatees código ajeno.
6. Al terminar cada fase: indica cómo ejecutarlo y probarlo, qué quedó pendiente y qué migraciones SQL debe revisar el usuario.
7. Mantén `README.md` con: requisitos, variables de entorno, cómo levantar backend (`php -S localhost:8000 -t backend/public`) y frontend (`npm run dev`), y cómo desplegar.

## 12. Comandos de referencia

```bash
# Backend
cd backend && composer install
php -S localhost:8000 -t public

# Frontend
cd frontend && npm install
npm run dev
npm run build
npm run lint
npm run test
```

## 13. Definición de "terminado"

Una funcionalidad está lista cuando: funciona de extremo a extremo (UI → API → BD), valida en frontend y backend, maneja errores y estados de carga/vacío, respeta la seguridad y rendimiento de este documento, y está documentada en el README si añade configuración.
