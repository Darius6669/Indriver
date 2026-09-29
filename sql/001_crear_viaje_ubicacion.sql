-- ============================================================
-- indriver / 001 - tabla de historial de ubicaciones
-- El proyecto tiene synchronize:false y no usa migraciones,
-- asi que este script se corre a mano en Postgres.
-- Es idempotente: se puede volver a ejecutar sin romper nada.
-- ============================================================

-- gen_random_uuid() es nativo desde Postgres 13. La extension queda por
-- si el proyecto corre sobre 12 o menos.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS viaje_ubicacion (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_viaje    INTEGER                    NOT NULL,
    lactitud    DOUBLE PRECISION           NOT NULL,
    longitud    DOUBLE PRECISION           NOT NULL,
    velocidad   DOUBLE PRECISION           NULL,
    rumbo       DOUBLE PRECISION           NULL,
    precision   DOUBLE PRECISION           NULL,
    recorded_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_viaje_ubicacion_viaje
        FOREIGN KEY (id_viaje) REFERENCES viaje (id_viaje)
        ON DELETE CASCADE
);

-- Consulta caliente: "dame el recorrido del viaje X de las ultimas N horas".
-- El indice es compuesto y en orden DESC para que aproveche el index scan.
CREATE INDEX IF NOT EXISTS idx_viaje_ubicacion_viaje_fecha
    ON viaje_ubicacion (id_viaje, recorded_at DESC);

-- Lastre de seguridad por si algun reporte barre la tabla entera por fecha.
CREATE INDEX IF NOT EXISTS idx_viaje_ubicacion_recorded_at
    ON viaje_ubicacion (recorded_at DESC);

-- ------------------------------------------------------------
--  viaje.fecha_final pasa a nullable: NULL = viaje en curso.
--  Asi "viajes activos" es un indice parcial barato en vez de un NOT EXISTS.
-- ------------------------------------------------------------
ALTER TABLE viaje ALTER COLUMN fecha_final DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_viaje_activos
    ON viaje (id_viaje) WHERE fecha_final IS NULL;
