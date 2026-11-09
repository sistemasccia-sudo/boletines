-- ============================================================================
-- 003_cartas_codigo_unico.sql
-- Fase: 5 (Cartas) - REVISAR Y EJECUTAR MANUALMENTE
-- Descripción: garantiza la unicidad del código de carta por año
--              (formato visible NNN-AAAA = codigo + anio) y acelera la
--              búsqueda del siguiente código.
-- Aditiva y reversible.
-- ============================================================================

-- Paso previo recomendado: verificar que no existan códigos repetidos por año.
--   SELECT codigo, anio, COUNT(*) FROM cartas GROUP BY codigo, anio HAVING COUNT(*) > 1;

ALTER TABLE `cartas`
  ADD UNIQUE KEY `uq_cartas_codigo_anio` (`codigo`, `anio`);

-- ---------------------------------------------------------------------------
-- Reversa:
-- ALTER TABLE `cartas` DROP KEY `uq_cartas_codigo_anio`;
-- ---------------------------------------------------------------------------
