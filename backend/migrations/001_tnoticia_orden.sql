-- ============================================================================
-- 001_tnoticia_orden.sql
-- Fase: 4 (Cambiar orden de noticias) - REVISAR Y EJECUTAR MANUALMENTE
-- Descripción: agrega la columna de orden para las noticias del día y un
--              índice compuesto (fecha, orden) para listar rápido el día.
-- Aditiva y reversible. NO contiene DROP/TRUNCATE/DELETE.
-- ============================================================================

ALTER TABLE `tnoticia`
  ADD COLUMN `orden` INT NOT NULL DEFAULT 0 AFTER `fecha`,
  ADD INDEX `idx_tnoticia_fecha_orden` (`fecha`, `orden`);

-- ---------------------------------------------------------------------------
-- Reversa:
-- ALTER TABLE `tnoticia`
--   DROP INDEX `idx_tnoticia_fecha_orden`,
--   DROP COLUMN `orden`;
-- ---------------------------------------------------------------------------
