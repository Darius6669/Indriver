-- ============================================================
-- indriver / 003 - evitar viajes duplicados
-- El proyecto tiene synchronize:false y no usa migraciones,
-- asi que este script se corre a mano en Postgres.
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================

-- ------------------------------------------------------------
--  1) viaje_ubicacion.id ya es unico
-- ------------------------------------------------------------
-- No hace falta ALTER: en sql/001 se creo como
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid()
-- y PRIMARY KEY ya implica UNIQUE + NOT NULL. Este bloque solo lo
-- verifica y lo repara por si la tabla se hubiera creado a mano sin PK.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'viaje_ubicacion'::regclass AND contype = 'p'
    ) THEN
        ALTER TABLE viaje_ubicacion ADD PRIMARY KEY (id);
    END IF;
END $$;

-- ------------------------------------------------------------
--  2) Un solo viaje ABIERTO por vehiculo (la garantia real)
-- ------------------------------------------------------------
-- Antes de crear el indice, revisar si ya hay duplicados:
--   SELECT vehiculo_id, count(*) FROM viaje
--   WHERE fecha_final IS NULL GROUP BY vehiculo_id HAVING count(*) > 1;
-- Si aparece algo, cerrar los sobrantes (fecha_final = now()) y recien
-- despues correr el indice, o el CREATE va a fallar por datos sucios.
CREATE UNIQUE INDEX IF NOT EXISTS ux_viaje_abierto_vehiculo
    ON viaje (vehiculo_id)
    WHERE fecha_final IS NULL;

-- ------------------------------------------------------------
--  3) (Opcional y DESACTIVADO) un solo viaje ABIERTO por conductor
-- ------------------------------------------------------------
-- NO se crea por defecto. La invariante del sistema es por VEHICULO: un
-- mismo conductor puede mover placas distintas (asi lo hacen los scripts de
-- prueba, que usan un solo usuario para varios buses). Ademas el seed deja
-- viajes abiertos de conductor_test/conductor2_test, asi que este indice
-- haria fallar la creacion de viajes nuevos con esos usuarios.
-- Descomentar solo si tu operacion exige un vehiculo por conductor.
--
-- Si en una corrida ANTERIOR de este script se creo, se elimina ahora:
DROP INDEX IF EXISTS ux_viaje_abierto_usuario;
--
-- CREATE UNIQUE INDEX IF NOT EXISTS ux_viaje_abierto_usuario
--     ON viaje (user_id)
--     WHERE fecha_final IS NULL;

-- ------------------------------------------------------------
--  4) (DESACTIVADO) columna estado
-- ------------------------------------------------------------
-- No hace falta: el estado se deduce de fecha_final (NULL = abierto) mas la
-- sesion viva en memoria. Se deja el bloque comentado por si algun dia se
-- necesita consultar "asignado vs en_curso" solo desde la BD.
--
-- ALTER TABLE viaje ADD COLUMN IF NOT EXISTS estado VARCHAR(20);
-- UPDATE viaje SET estado = 'en_curso'   WHERE estado IS NULL AND fecha_final IS NULL;
-- UPDATE viaje SET estado = 'finalizado' WHERE estado IS NULL AND fecha_final IS NOT NULL;
-- ALTER TABLE viaje ALTER COLUMN estado SET DEFAULT 'en_curso';
-- Valores sugeridos: 'asignado' | 'en_curso' | 'finalizado'
