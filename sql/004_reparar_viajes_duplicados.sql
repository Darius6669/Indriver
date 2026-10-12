-- ============================================================
-- indriver / 004 - reparar viajes duplicados (una sola pasada)
-- Pegar tal cual en Postgres. Es idempotente: se puede repetir.
-- ============================================================

-- 1) viaje_ubicacion.id debe ser PK (repara si se creo a mano sin PK)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'viaje_ubicacion'::regclass AND contype = 'p'
    ) THEN
        ALTER TABLE viaje_ubicacion ADD PRIMARY KEY (id);
    END IF;
END $$;

-- 2) Cerrar duplicados: deja ABIERTO solo el viaje mas nuevo por vehiculo.
--    Si no hay duplicados, no toca ninguna fila.
UPDATE viaje SET fecha_final = now()
WHERE fecha_final IS NULL
  AND id_viaje NOT IN (
    SELECT max(id_viaje) FROM viaje
    WHERE fecha_final IS NULL
    GROUP BY vehiculo_id
  );

-- 3) Un solo viaje ABIERTO por vehiculo (la garantia real)
CREATE UNIQUE INDEX IF NOT EXISTS ux_viaje_abierto_vehiculo
    ON viaje (vehiculo_id)
    WHERE fecha_final IS NULL;

-- 4) Eliminar el indice por conductor de corridas viejas (ya no se usa)
DROP INDEX IF EXISTS ux_viaje_abierto_usuario;

-- 5) Chequeo final: NO debe devolver filas (0 duplicados)
SELECT vehiculo_id, count(*) FROM viaje
WHERE fecha_final IS NULL GROUP BY vehiculo_id HAVING count(*) > 1;
