-- ============================================================================
-- 007_alinear_bd_productivo.sql
-- Fase: corrección de producción (500 en pestañas Noticias y Fuentes)
-- Descripción: agrega las dos columnas que `docs/schema.sql` (dump de
--              referencia) ya define pero faltan en la BD de producción,
--              según el error real registrado en storage/app.log:
--                - Unknown column 'state'          → fuente_diarios.state
--                - Unknown column 'n.pagina_web'   → tnoticia.pagina_web
-- Aditiva y reversible. NO contiene DROP/TRUNCATE/DELETE.
--
-- Verificación previa en phpMyAdmin:
--   SHOW COLUMNS FROM fuente_diarios LIKE 'state';
--   SHOW COLUMNS FROM tnoticia LIKE 'pagina_web';
--   (si alguna columna ya existe, omite ese ALTER.)
-- ============================================================================

ALTER TABLE `fuente_diarios`
  ADD COLUMN `state` tinyint(4) NOT NULL DEFAULT 1;

ALTER TABLE `tnoticia`
  ADD COLUMN `pagina_web` tinyint(1) NOT NULL DEFAULT 0;

-- ---------------------------------------------------------------------------
-- Opcional: marcar todas las noticias existentes como "mostrar en web = sí".
-- Por defecto la columna queda en 0, igual que en docs/schema.sql:
--
-- UPDATE `tnoticia` SET `pagina_web` = 1;
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- Reversa:
-- ALTER TABLE `fuente_diarios` DROP COLUMN `state`;
-- ALTER TABLE `tnoticia` DROP COLUMN `pagina_web`;
-- ---------------------------------------------------------------------------
