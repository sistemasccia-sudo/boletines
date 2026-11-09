# Prompt para el agente

> Copia y pega el contenido de abajo a tu agente. Asegúrate de que `AGENTS.md` esté en la raíz del repo y de darle el dump del esquema (`schema.sql`) de tu base MySQL, ideal en `/docs/schema.sql`.

---

Actúa como desarrollador full stack senior. Vamos a **modernizar un software antiguo** reemplazándolo por una SPA en **React** con un **backend pequeño en PHP** que expone endpoints REST sobre mi **base de datos MySQL existente** (la administro con phpMyAdmin).

**Antes de empezar, lee `AGENTS.md`** (stack, seguridad, rendimiento, convenciones y reglas de negocio) y el esquema de BD en `/docs/schema.sql`. Respeta ambos estrictamente. Si te falta información crítica, pregúntame antes de suponer.

## Qué debe hacer el sistema

**Login de usuarios** y, tras autenticarse, una **página principal con un grid** para elegir entre 3 módulos: **Bol. Noticias**, **Bol. Legal** y **Cartas**.

### Módulo Bol. Noticias
Navegación por pestañas: *Noticias, Artículos, Portadas, Tipo de cambio, Cambiar orden de noticias, Obituarios, Fuentes de información*.

| Pestaña | Funcionalidad | Campos del formulario |
|---|---|---|
| **Noticias** | CRUD | Título (textarea) · Bajada (textarea) · Cuerpo (editor de texto enriquecido) · Tipo (select: local, nacional, internacional, informe económico) · Fuente (select, cargado desde la tabla de fuentes) · Mostrar en la página web (checkbox, `true` por defecto) · Imagen (input file) |
| **Artículos** | CRUD | Título (textarea) · Bajada (textarea) · Cuerpo (editor de texto enriquecido) · Imagen (input file) |
| **Portadas** | CRUD | Subir portada (input file) |
| **Tipo de cambio** | CRUD | Fuente (select: SUNAT, RPP, EL COMERCIO) · Compra (decimal) · Venta (decimal) · Fecha (date) |
| **Cambiar orden de noticias** | Solo noticias del **día actual**. El usuario selecciona **2 noticias** y las **intercambia** de posición. Ejemplo: subí una noticia el 03-11-2026 a las 10:00 am y otra a las 11:00 am; quiero poder invertir su orden. | — |
| **Obituarios** | CRUD | Nombre (text) · Descripción (textarea) |
| **Fuentes de información** | CRUD | Nombre de referencia (text) |

### Módulo Bol. Legal
CRUD con: Título (textarea) · Norma legal (textarea) · Cuerpo (editor de texto enriquecido) · Fecha (date, por defecto la fecha actual).

### Módulo Cartas
CRUD con: Código (text, por defecto el **siguiente código** al último de la BD con formato `571-2026`) · Remitente (text) · Destinatario (text) · Asunto (textarea).
El data table de Cartas debe tener **un filtro de búsqueda por cada campo**.

## Requisitos técnicos clave

- **Eficiencia:** los data tables deben cargar rápido → paginación, orden y filtros **en el servidor**, **React Query** para caché/invalidación, debounce en filtros, y listados que no traigan el cuerpo HTML completo.
- **Backend PHP** con endpoints REST (`/api/v1/...`), PDO con consultas preparadas, autenticación, validación y subida segura de imágenes.
- **Datos existentes:** usa el esquema actual; cualquier cambio de BD (índices, columna de orden, UNIQUE en código de carta) entrégalo como **script SQL en `/backend/migrations`** para que yo lo revise y ejecute. No toques datos ni estructura automáticamente.
- **Imágenes:** toda imagen subida (noticias, artículos, portadas e imágenes insertadas en el editor) debe pasar por un servicio único en el backend que la **convierta a WebP, la redimensione, elimine metadatos EXIF y genere una miniatura**, de modo que nunca se guarden imágenes pesadas. Parámetros configurables por `.env`.
- **Rich text:** los campos del editor se guardan en BD como **HTML con etiquetas**, sanitizado en el backend con lista blanca. Las imágenes dentro del editor se suben por endpoint (nunca en base64).
- Interfaz en **español**.

## Cómo quiero que trabajes (por fases)

Al terminar cada fase, déjame el proyecto ejecutable, explícame cómo probarlo y espera mi confirmación antes de seguir.

**Fase 0 – Análisis y plan.** Lee `schema.sql`, resume las tablas/columnas que mapearás a cada módulo, lista dudas y migraciones sugeridas, y propón el plan. *No escribas código todavía.*

**Fase 1 – Base.** Estructura del monorepo (`/backend`, `/frontend`), configuración `.env`, conexión PDO, router, middleware de auth y CORS, endpoint de login (con migración transparente de hash de contraseñas si el legacy usa uno débil), cliente API y React Query en el frontend, layout, rutas protegidas, página de login y **página principal con el grid de módulos**.

**Fase 2 – Componentes reutilizables.** `DataTable` genérico server-side (paginación, orden, filtros por columna, estados de carga/vacío), `RichTextEditor` (TipTap), `ImageUpload` con vista previa, y helper de CRUD (hooks de React Query por recurso).

**Fase 3 – Módulo Bol. Noticias.** Empieza por *Fuentes de información* (porque Noticias depende de ella), luego Noticias, Artículos, Portadas, Tipo de cambio y Obituarios.

**Fase 4 – Cambiar orden de noticias.** Endpoint transaccional de intercambio y UI de selección de 2 noticias del día.

**Fase 5 – Bol. Legal y Cartas.** Incluye el endpoint de siguiente código de carta y los filtros por columna.

**Fase 6 – Pulido.** Pruebas de las reglas críticas, revisión de seguridad y rendimiento, índices sugeridos, README completo con instrucciones de despliegue.

## Entregables al final de cada fase

1. Código funcionando.
2. Resumen de lo hecho y archivos principales.
3. Comandos para ejecutar/probar.
4. Migraciones SQL pendientes de mi revisión.
5. Preguntas o decisiones que necesites de mí.

Empieza ahora por la **Fase 0**.
