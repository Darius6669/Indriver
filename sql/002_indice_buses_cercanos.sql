-- ============================================================
-- indriver / 002 - indice para "buses cerca de mi"
-- El proyecto tiene synchronize:false y no usa migraciones,
-- asi que este script se corre a mano en Postgres.
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================

-- ------------------------------------------------------------
--  Por que hace falta
-- ------------------------------------------------------------
-- GET /viajes/Tracking/Cercanos busca viajes EN CURSO dentro de un
-- radio. Antes de calcular la distancia se aplica una caja envolvente
-- (un rectangulo) para no pedirle a Postgres que compare coordenadas
-- de toda la tabla.
--
-- Ese rectangulo es un rango sobre lactitud, asi que un indice
-- (lactitud, longitud) deja de recorrer la tabla completa.
--
-- Parcial (WHERE fecha_final IS NULL) porque la consulta solo mira
-- viajes activos: son unos pocos cientos como mucho, mientras que la
-- tabla completa guarda todos los viajes historicos y crece sin
-- parar. Chupar de una tabla pequena es la diferencia entre 1 ms y
-- 500 ms.
-- ------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_viaje_activos_ubicacion
    ON viaje (lactitud, longitud)
    WHERE fecha_final IS NULL;

-- ------------------------------------------------------------
--  NOTA HONESTA
-- ------------------------------------------------------------
-- Esto NO es un indice espacial. Con lat/lng planas, Postgres compara
-- floats fila por fila dentro de la caja y recien ahi afina la
-- distancia. Alcanza de sobra para cientos de buses activos, pero si
-- este proyecto llega a miles de vehicles simultaneos, la respuestas
-- correcta es PostGIS:
--
--   CREATE EXTENSION IF NOT EXISTS postgis;
--   ALTER TABLE viaje
--       ADD COLUMN ubicacion geography(Point, 4326)
--       GENERATED ALWAYS AS (
--           ST_SetSRID(ST_MakePoint(longitud, lactitud), 4326)
--           ::geography
--       ) STORED;
--   CREATE INDEX idx_viaje_geo ON viaje USING GIST (ubicacion)
--       WHERE fecha_final IS NULL;
--
-- y ahi la consulta seria ST_DWithin(ubicacion, ST_MakePoint($lng,$lat,4326)::geography, $radio).
-- Para la escala actual, con el indice de arriba basta y sobra.
