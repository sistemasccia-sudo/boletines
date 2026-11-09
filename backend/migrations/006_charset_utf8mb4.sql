-- ============================================================================
-- 006_charset_utf8mb4.sql (OPCIONAL)
-- Fase: 6 (Rendimiento/consistencia) - REVISAR Y EJECUTAR MANUALMENTE
-- Descripción: convierte a utf8mb4 las tablas que todavía usan latin1 para
--              evitar caracteres mal codificados (mojibake) al escribir desde
--              la API. No altera datos existentes, solo su codificación.
-- ADVERTENCIA: en MyISAM (tarticulo, tcambio) la tabla queda bloqueada durante
--              la conversión. Ejecutar en horario de baja actividad y con
--              respaldo previo.
-- ============================================================================

ALTER TABLE `portadas`
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

ALTER TABLE `tarticulo`
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

ALTER TABLE `tcambio`
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

ALTER TABLE `tobituario`
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

ALTER TABLE `fuente_diarios`
  CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;

-- ---------------------------------------------------------------------------
-- Reversa (volver al charset original de cada tabla):
-- ALTER TABLE `portadas`       CONVERT TO CHARACTER SET latin1 COLLATE latin1_swedish_ci;
-- ALTER TABLE `tarticulo`      CONVERT TO CHARACTER SET latin1 COLLATE latin1_swedish_ci;
-- ALTER TABLE `tcambio`        CONVERT TO CHARACTER SET latin1 COLLATE latin1_swedish_ci;
-- ALTER TABLE `tobituario`     CONVERT TO CHARACTER SET latin1 COLLATE latin1_swedish_ci;
-- ALTER TABLE `fuente_diarios` CONVERT TO CHARACTER SET latin1 COLLATE latin1_swedish_ci;
-- ---------------------------------------------------------------------------
