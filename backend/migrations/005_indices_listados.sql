-- ============================================================================
-- 005_indices_listados.sql
-- Fase: 6 (Rendimiento) - REVISAR Y EJECUTAR MANUALMENTE
-- Descripción: índices sobre las columnas que se filtran y ordenan en los
--              data tables (estado + fecha).
-- Aditiva y reversible.
-- ============================================================================

ALTER TABLE `tnoticia`
  ADD INDEX `idx_tnoticia_estado_fecha` (`estado`, `fecha`);

ALTER TABLE `tarticulo`
  ADD INDEX `idx_tarticulo_estado_fecha` (`estado`, `fecha`);

ALTER TABLE `normas_legales`
  ADD INDEX `idx_normas_estado_fecha` (`estado`, `fecha`);

ALTER TABLE `tobituario`
  ADD INDEX `idx_tobituario_fecha` (`fecha`);

ALTER TABLE `cartas`
  ADD INDEX `idx_cartas_estado_fecha` (`estado`, `fecha`);

-- ---------------------------------------------------------------------------
-- Reversa:
-- ALTER TABLE `tnoticia`      DROP INDEX `idx_tnoticia_estado_fecha`;
-- ALTER TABLE `tarticulo`     DROP INDEX `idx_tarticulo_estado_fecha`;
-- ALTER TABLE `normas_legales` DROP INDEX `idx_normas_estado_fecha`;
-- ALTER TABLE `tobituario`    DROP INDEX `idx_tobituario_fecha`;
-- ALTER TABLE `cartas`        DROP INDEX `idx_cartas_estado_fecha`;
-- ---------------------------------------------------------------------------
