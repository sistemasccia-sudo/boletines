-- ============================================================================
-- 008_tcambio_fecha_unica.sql
-- Fase: 3 (Tipo de cambio) - REVISAR Y EJECUTAR MANUALMENTE
-- Descripción: un solo registro de tipo de cambio por fecha (regla de
--              negocio confirmada). La fuente NO vive en una columna: se
--              guarda dentro del texto de compra/venta, p. ej.
--              "3.745 (SUNAT)", por lo que la unicidad es solo por fecha.
-- Aditiva y reversible. NO contiene DROP/TRUNCATE/DELETE.
-- ============================================================================

-- Paso previo recomendado: verificar que no haya fechas repetidas.
-- Si esta consulta devuelve filas, revísalas ANTES de ejecutar el ALTER:
--   SELECT fecha, COUNT(*) FROM tcambio GROUP BY fecha HAVING COUNT(*) > 1;

ALTER TABLE `tcambio`
  ADD UNIQUE KEY `uq_tcambio_fecha` (`fecha`);

-- ---------------------------------------------------------------------------
-- Reversa:
-- ALTER TABLE `tcambio` DROP KEY `uq_tcambio_fecha`;
-- ---------------------------------------------------------------------------
