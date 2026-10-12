# Módulo Socket (tiempo real)

Canal en vivo del tracking: el teléfono del conductor **publica** su GPS y el
servidor lo **retransmite** a las rooms. Socket.IO sobre el mismo puerto HTTP.

- Gateway: [`src/websocket/websocket.gateway.ts`](./src/websocket/websocket.gateway.ts)
- Servicio (estado en memoria): [`src/websocket/websocket.service.ts`](./src/websocket/websocket.service.ts)
- Tipos/constantes/rooms: [`src/websocket/websocket.types.ts`](./src/websocket/websocket.types.ts)
- Módulo: [`src/websocket/websocket.module.ts`](./src/websocket/websocket.module.ts)
- DTOs WS: [`src/dtos/viajes/TrackingWs.dto.ts`](./src/dtos/viajes/TrackingWs.dto.ts)

## Conexión y autenticación

- Config: `transports: ['websocket','polling']`, CORS abierto.
- El **JWT** se manda en `handshake.auth.token` (o `handshake.query.token`).
- El handshake verifica: token válido → usuario existe → `status` activo.
- **El rol NO se valida al conectar**: cualquier autenticado puede ver el mapa
  (supervisor, pasajero). Lo que exige rol `Conductor` es **publicar**
  posiciones (`exigirConductor` en cada evento de escritura).
- Rechazo ⇒ emite `error:no_autorizado` con `{ code, message }` y cierra el
  socket ~50ms después. Códigos: `token_ausente`, `token_expirado`,
  `token_invalido`, `usuario_no_existe`, `usuario_inactivo`, `rol_sin_permiso`.
- Al conectar, el servidor emite `conexion:lista` con la identidad, `server_time`
  y el snapshot de viajes activos.

## Eventos cliente → servidor

Todos aceptan un **ack** opcional (callback) que responde `{ ok, ... }`.

| Evento | DTO | Quién | Descripción |
| --- | --- | --- | --- |
| `viaje:start` | `IniciarViajeWsDto` | Conductor | Enciende un viaje ya creado por el REST (reutiliza `id_viaje`). Ack: `{ ok, id_viaje, numero_ruta, placa, fecha_inicio }`. |
| `viaje:ubicacion` | `UbicacionWsDto` | Conductor | Empuja una posición GPS. Ack: `{ ok, aceptado, motivo, id_viaje }`. |
| `viaje:reconectar` | `ReconectarViajeWsDto` | Conductor | Retoma un viaje tras caída de red. |
| `viaje:pausa` | `CerrarViajeWsDto` | Conductor | Cierra el viaje (mismo handler que `viaje:finalizar`). |
| `viaje:finalizar` | `CerrarViajeWsDto` | Conductor | Cierra el viaje. |
| `suscribir:ruta` | `SuscribirRutaWsDto` | Cualquiera | Entra a la room de la ruta y recibe un snapshot. |
| `desuscribir:ruta` | `SuscribirRutaWsDto` | Cualquiera | Sale de la room. |
| `viajes:activos` | — | Cualquiera | Devuelve el snapshot de todos los viajes activos. |
| `ping` | `{ ts? }` | Cualquiera | Heartbeat; refresca `lastSeen` y mide latencia. Ack: `{ ok, server_time, cliente_ts }`. |

Comportamiento de `viaje:ubicacion`:
- **Rate limit** token bucket por socket: `RATE_LIMIT_POR_SEGUNDO=30`, ráfaga `60`. Excedido ⇒ ack `{ ok:false, code:'rate_limit' }` (no desconecta).
- Un punto **filtrado** (sin movimiento o demasiado seguido) no es error: ack `{ ok:true, aceptado:false, motivo }`.

## Eventos servidor → cliente

| Evento | Payload |
| --- | --- |
| `conexion:lista` | Identidad + `viajes_activos` (snapshot). |
| `viaje:iniciado` / `viaje:reconectado` | `{ id_viaje, numero_ruta, placa, fecha_inicio }`. |
| `viaje:disponible` | A la room de la ruta cuando un bus arranca. |
| `viaje:ubicaciones` | **Batch** por ruta: `{ buses: [{ id_viaje, lat, lng, velocidad, rumbo, precision, ts }] }`. |
| `viaje:ubicacion` | Punto individual a las rooms chicas (viaje/conductor). |
| `viaje:finalizado` / `viaje:cerrado` | `ViajeFinalizado` (incluye `ultima_ubicacion`, `duracionMs`). |
| `viaje:descartado` | Sesión expirada por el reaper. |
| `suscrito:ruta` | Snapshot de la ruta. |
| `error:no_autorizado`, `error:validacion`, `error:no_encontrado`, `error:conflicto`, `error:interno` | Errores. |

## Rooms

Todo sale del viaje (no hay columnas nuevas):
`conductor:<username>`, `ruta:<numero_ruta>`, `cooperativa:<rif>`, `viaje:<id_viaje>`.

## Estado en memoria (fuente de verdad "caliente")

`WebsocketService` guarda `Map<id_viaje, ViajeSession>`. La clave es `id_viaje`;
el identificador real del bus es la **placa**.

`ViajeSession` incluye: `lastLocation` (`PuntoUbicacion`), `online`,
`pendingDbUpdate`, `lastDbUpdateAt`, `lastSeen`, etc.

Ciclo de vida:
- `iniciarViaje`: valida dueño/ruta/placa, bloquea 2º viaje de la misma placa, crea la sesión y **siembra `viaje_ubicacion`** (UPSERT).
- `registrarUbicacion`: filtra GPS (min 10 m / min 1 s), actualiza memoria y encola el batch de difusión + el refresco a BD (`pendingDbUpdate`).
- `finalizarViaje`: persiste la última posición, setea `fecha_final` y elimina la sesión.
- `marcarSesionOffline`: al desconectar **NO cierra el viaje**, solo marca `online=false`.
- `reconectar` / `reaper`: retoma viajes o descarta sesiones viejas (>24h offline).

## Persistencia de posiciones

- La posición vive en **`viaje_ubicacion`**: **una fila por viaje** vía **UPSERT** (`persistirUbicacion`).
- Se escribe al iniciar, en el `tick` (throttle `DB_UPDATE_INTERVAL_MS=30s`) y al finalizar.
- **Nunca** se actualiza `viaje.lactitud/longitud` durante el recorrido.
- El UPSERT requiere `UNIQUE(id_viaje)` → `sql/005_una_ubicacion_por_viaje.sql`.

## Temporizadores y constantes (`websocket.types.ts`)

| Constante | Default | Qué hace |
| --- | --- | --- |
| `BROADCAST_INTERVAL_MS` (`WS_BROADCAST_MS`) | 3000 | Agrupa posiciones y difunde 1 mensaje por ruta. |
| `TICK_INTERVAL_MS` | 10000 | Tick interno. |
| `DB_UPDATE_INTERVAL_MS` | 30000 | Throttle del UPSERT a `viaje_ubicacion`. |
| `MIN_DISTANCIA_M` | 10 | Filtro de ruido del GPS. |
| `MIN_INTERVAL_PUNTO_MS` | 1000 | Mínimo entre dos fixes. |
| `SESION_TIMEOUT_MS` | 45000 | Sin ping ⇒ offline. |
| `MAX_SESION_HORAS` | 24 | Offline más tiempo ⇒ se descarta. |
| `RATE_LIMIT_POR_SEGUNDO` / `RAFAGA` | 30 / 60 | Límite por socket. |

## Apagado

`main.ts` llama `enableShutdownHooks()`. Al apagar, `onModuleDestroy()` hace un
flush forzado de la última posición de todas las sesiones (UPSERT) antes de salir.
