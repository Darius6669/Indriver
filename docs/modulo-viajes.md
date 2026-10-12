# Módulo Viajes (REST)

API HTTP para crear viajes, consultar posiciones y buscar buses cercanos.
Base: `http://<host>:<PORT_APP>` (default `3000`). Prefijo del controller: **`/viajes`**.

- Código: [`src/viajes/viajes.controller.ts`](./src/viajes/viajes.controller.ts), [`src/viajes/viajes.service.ts`](./src/viajes/viajes.service.ts)
- Módulo: [`src/viajes/viajes.module.ts`](./src/viajes/viajes.module.ts)
- DTOs: [`src/dtos/viajes/`](./src/dtos/viajes)
- Entidades: [`src/entidades/Viajes.entity.ts`](./src/entidades/Viajes.entity.ts), [`src/entidades/ViajeUbicacion.entity.ts`](./src/entidades/ViajeUbicacion.entity.ts)

## Modelo de datos

| Tabla | Rol |
| --- | --- |
| `viaje` | Metadatos del viaje (id, fechas, usuario, vehículo, ruta) **+ la posición INICIAL**. `lactitud`/`longitud` se setean al crear el viaje y **no se vuelven a tocar** durante el recorrido. |
| `viaje_ubicacion` | **Posición actual**: UNA fila por viaje (`UNIQUE(id_viaje)`). Se actualiza con UPSERT. Guarda `lactitud`, `longitud`, `velocidad`, `rumbo`, `precision`, `recorded_at`. |

> Regla clave: **el bus se mueve ⇒ cambia `viaje_ubicacion`, no `viaje`.**

Un viaje está **activo** mientras `viaje.fecha_final IS NULL`.
Se permite **un solo viaje activo por vehículo** (índice único parcial `ux_viaje_abierto_vehiculo`, ver `sql/003` y `sql/004`).

Scripts SQL relevantes en [`sql/`](./sql):
- `001_crear_viaje_ubicacion.sql` — tabla `viaje_ubicacion` + `fecha_final` nullable.
- `002_indice_buses_cercanos.sql` — índices para la búsqueda por radio.
- `003_evitar_viajes_duplicados.sql` — un viaje abierto por vehículo.
- `004_reparar_viajes_duplicados.sql` — repara duplicados existentes.
- `005_una_ubicacion_por_viaje.sql` — deduplica y crea `UNIQUE(id_viaje)` en `viaje_ubicacion` (**lo requiere el UPSERT**).

## Endpoints

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/viajes/Crear-Viaje` | Crea el viaje (o devuelve el abierto del vehículo). |
| `GET` | `/viajes/Obtener-Viaje` | Lista todos los viajes. |
| `GET` | `/viajes/Obtener-viaje-Id/:id` | Viaje por id (con relaciones). |
| `PATCH` | `/viajes/Actualizar-viaje/:id` | Actualiza un viaje. |
| `DELETE` | `/viajes/Elimnar-viaje/:id` | Elimina un viaje. |
| `GET` | `/viajes/Tracking/Viajes-activos` | Viajes en curso (`fecha_final IS NULL`). |
| `GET` | `/viajes/Tracking/Ultima-ubicacion/:id` | Última posición conocida **desde `viaje_ubicacion`** (fallback a `viaje`). |
| `GET` | `/viajes/Tracking/Ubicacion/:id` | **Fila cruda de `viaje_ubicacion`** con `velocidad`/`rumbo`/`precision`/`recorded_at`. |
| `GET` | `/viajes/Tracking/Recorrido/:id` | Puntos del viaje (una fila por viaje ⇒ hoy devuelve **1 punto**). `?horas=1..24`. |
| `GET` | `/viajes/Tracking/Cercanos` | "Buses cerca de mí", ordenados por cercanía. |
| `POST` | `/viajes/Tracking/Registrar-ubicacion/:id` | **Fallback REST** del GPS: UPSERT en `viaje_ubicacion`. |

Todas las respuestas van envueltas en `{ message, control }`.

### `POST /viajes/Crear-Viaje`

Body (`CreateViajesDto`): `fecha_inicio`, `fecha_final`, `lactitud`, `longitud`, `id_user`, `id_vehiculo`, `id_ruta`, `incidencia_id?`.

Comportamiento:
1. Valida ruta/usuario/vehículo (e incidencia si viene).
2. Si el **vehículo ya tiene un viaje abierto**, devuelve ese (no crea duplicado).
3. Crea el viaje con la posición inicial y lo devuelve.

El **socket** luego "enciende" ese viaje con `viaje:start` reutilizando `id_viaje`.

### `GET /viajes/Tracking/Ultima-ubicacion/:id`

```json
{
  "id_viaje": 74,
  "lat": 10.4856,
  "lng": -66.9036,
  "en_curso": false,
  "fecha_inicio": "2026-10-12T01:13:05.392Z",
  "fecha_final": "2026-10-12T01:13:44.731Z"
}
```
Lee `viaje_ubicacion`; si el viaje aún no tiene fila, cae a `viaje.lactitud/longitud`.

### `GET /viajes/Tracking/Ubicacion/:id`

```json
{
  "id_viaje": 74,
  "en_curso": false,
  "existe_ubicacion": true,
  "ubicacion": {
    "id": "uuid...",
    "lactitud": 10.4856,
    "longitud": -66.9036,
    "velocidad": 42,
    "rumbo": 0,
    "precision": 8,
    "recorded_at": "2026-10-11T21:13:07.112Z"
  }
}
```
Si el viaje no tiene punto todavía: `existe_ubicacion: false` y `ubicacion: null`.
Si el viaje no existe: `404`.

### `GET /viajes/Tracking/Cercanos`

Query (`BuscarCercanosDto`): `lactitud` (req), `longitud` (req), `radio` (m, 50..50000, def 1000), `limite` (1..100, def 20), `soloOnline` (bool, def false).

> `forbidNonWhitelisted`: cualquier query param no declarado ⇒ **400**. Es intencional.

La búsqueda mezcla dos fuentes:
1. **BD** (`viaje_ubicacion` con `COALESCE(ubicacion, viaje)`), para sobrevivir reinicios.
2. **Memoria del socket** (posición al instante + flag `online`), que corrige y reordena.

Cada bus incluye `id_viaje`, `lat`, `lng`, `distancia_m`, `online`, `posicion_en_vivo`, `velocidad`, `rumbo`, `ts_actualizacion`, `placa`, `numero_ruta`, `nombre_ruta`, `username`.

### `POST /viajes/Tracking/Registrar-ubicacion/:id`

Body (`RegistrarUbicacionDto`): `lactitud`, `longitud`.
Hace UPSERT en `viaje_ubicacion` y devuelve lo mismo que `Ultima-ubicacion`. Se usa cuando el socket no está disponible.

## Archivos

| Archivo | Contenido |
| --- | --- |
| `viajes.controller.ts` | Rutas REST. |
| `viajes.service.ts` | Lógica: `CreateViajes`, `buscarViajeAbierto`, `ObtenerUltimaUbicacion`, `ObtenerUbicacion`, `ObtenerRecorrido`, `RegistrarUbicacionManual`, `ObtenerViajesCercanos`. |
| `src/dtos/viajes/*.dto.ts` | Validación de entrada. |
