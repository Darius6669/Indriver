-- ============================================================
-- indriver / 005 - una ubicacion por viaje
-- La posicion actual del bus vive en viaje_ubicacion: UNA fila por
-- viaje que se actualiza (antes era append-only, una fila por punto).
-- Pegar tal cual en Postgres. Es idempotente.
-- ============================================================

-- 1) Si quedaron varias filas por viaje, dejar solo la mas reciente.
DELETE FROM viaje_ubicacion a
USING viaje_ubicacion b
WHERE a.id_viaje = b.id_viaje
  AND (
    a.recorded_at < b.recorded_at
    OR (a.recorded_at = b.recorded_at AND a.id < b.id)
  );

-- 2) Garantizar una sola fila por viaje (lo que usa el UPSERT del server).
CREATE UNIQUE INDEX IF NOT EXISTS ux_viaje_ubicacion_viaje
    ON viaje_ubicacion (id_viaje);

-- 3) Chequeo final: NO debe devolver filas.
SELECT id_viaje, count(*) FROM viaje_ubicacion
GROUP BY id_viaje HAVING count(*) > 1;
