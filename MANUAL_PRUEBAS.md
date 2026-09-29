# Manual de pruebas — inDriver (tracking y websocket)

Todo lo que hay acá está **probado de verdad** contra el servidor y la base de datos de
este proyecto. Los valores de ejemplo son salidas reales, no inventadas.

---

## 1. Antes de empezar

### Qué necesitas

| Cosa | Versión | Verificar con |
|---|---|---|
| Node.js | 22 o superior | `node -v` |
| PostgreSQL | 15 o superior | `psql -h localhost -U postgres -c "SELECT 1"` |
| Las dependencias del proyecto | — | `npm install` |

### La base de datos

Las variables de entorno **no** usan los nombres típicos. Están en el `.env`:

```
USER_NAME=postgres
PASSWORD_BD=123456
HOST_BD=localhost
PORT_BD=5432
DB_NAME=Tracking
```

Ojo con esto: si alguna vez escribís un script que se conecte a la base, usá
`PASSWORD_BD` y no `DB_PASSWORD`, y `HOST_BD` y no `DB_HOST`.

### Los SQL que hay que correr una vez

El proyecto tiene `synchronize: false`, así que **TypeORM no crea las tablas**.
Hay que correrlos a mano. Los tres son idempotentes, se pueden repetir sin romper nada.

```bash
psql -h localhost -U postgres -d Tracking -f sql/001_crear_viaje_ubicacion.sql
psql -h localhost -U postgres -d Tracking -f sql/002_indice_buses_cercanos.sql
```

Qué hace cada uno:

- `001` crea la tabla `viaje_ubicacion` (el historial GPS) con sus tres índices.
- `002` crea un índice parcial para que "buses cercanos" sea rápido.

> Ojo: tu base tiene tablas duplicadas por herencia de otro trabajo: `Ruta` y `ruta`,
> `Persona` y `persona`. **TypeORM solo usa las minúsculas.** Las mayúsculas están
> muertas; no las toques y no las siembres.

### Sembrar datos de prueba

```bash
npm run seed
```

Imprime al final los usuarios y sus placas. Se puede ejecutar las veces que quieras:
no duplica nada.

Además **deja el estado como debe estar**: borra cualquier viaje abierto en placas
`TEST-*` (dejáste alguno colgado de una corrida anterior) y vuelve a crear los tres
del seed. Así siempre empezás de la misma situación.

Y para borrarlo todo:

```bash
npm run seed:limpiar
```

No toca las rutas, las paradas ni las cooperativas, porque eso no es data de prueba.
La tabla `viaje_ubicacion` se limpia sola: la clave foránea tiene `ON DELETE CASCADE`.

### Arrancar el servidor

```bash
npm run start:dev
```

Queda en el puerto **3000**. Para levantar una segunda copia sin pisar la tuya:

```powershell
$env:PORT_APP="3100"
node dist/main.js
```

---

### Si usás PowerShell

En Windows la política de ejecución suele bloquear `npm`. Si te sale
*"No se puede cargar el archivo npm.ps1"*, usá la versión con extensión:

```powershell
npm.cmd run seed
npm.cmd run seed:limpiar
npm.cmd run prueba:cercanos
```

O los scripts directo, que no tienen ese problema:

```powershell
node scripts/seed-pruebas.js
node test-buses-cercanos.js
```

---

## 2. Los datos de prueba

Todos los usuarios tienen password **`clave123`**.

| Usuario | Rol | status | Para qué sirve |
|---|---|---|---|
| `conductor_test` | Conductor | `true` | El conductor principal |
| `conductor2_test` | Conductor | `true` | El segundo bus del recorrido |
| `conductor3_test` | Conductor | `true` | Un tercer bus en otra posición |
| `obs_test` | Admin | `true` | El que mira pero no publica |
| `inactivo_test` | Conductor | `false` | Para comprobar que el login lo rechaza |

### Las placas

Esto es importante y es la causa número uno de confusiones:

| Placas | Situación |
|---|---|
| `TEST-01` … `TEST-04` | **Libres.** Usá estas para abrir viajes por socket. |
| `TEST-05`, `TEST-06`, `TEST-07` | **Ya tienen un viaje abierto** (los siembra el script). Son los que aparecen en "buses cercanos". |

Si intentás abrir un viaje en una placa que ya tiene uno, el server te lo rebota con
`{ok:false, code:"validacion"}`. No es un error del script: es la regla de
"un vehículo, un viaje a la vez".

### Dónde están los buses

Tomando como referencia la Plaza Venezuela (`10.4806, -66.9036`):

| Vehículo | Posición | A cuánto está |
|---|---|---|
| `TEST-05` | `10.4806, -66.9036` | 0 m (encima de vos) |
| `TEST-06` | `10.4856, -66.9036` | ~556 m |
| `TEST-07` | `10.4906, -66.9036` | ~1.112 m |

---

## 3. El script de prueba completo del socket

Este es el que exercise todo: dos conductores, batching, un observador, una **caída
de red al 40 %** y el reenganche.

```bash
npm run start:dev                              # en la terminal 1
node test-conductor-ws.js conductor_test clave123 RUTA-001 TEST-01 RUTA-001 TEST-02
```

O con npm:

```bash
npm run prueba:socket -- conductor_test clave123 RUTA-001 TEST-01 RUTA-001 TEST-02
```

Los argumentos son:

```
node test-conductor-ws.js <usuario> <password> [ruta] [placa] [ruta2] [placa2]
```

Dura unos 90 segundos. Avisá con anticipación: es normal que seemingly se quede quieto,
porque entre eventos solo hay pausas de 3 segundos.

### Qué vas a ver

```
1) login
2) 2 conductores conectan y abren viaje
3) GPS cada 3s por cada bus
4) al 40%: se CAE la red de los dos (simula perder señal)
5) al 45%: reconectan con viaje:reconectar, NO abren viaje nuevo
6) siguen reportando
7) al final: viaje:finalizar en los dos
```

Salida real de la última corrida:

```
   [conductor 1] ping -> rtt 1ms
   [conductor 1] ubicacion guardada 10.4903,-66.8888
   [conductor 2] ubicacion guardada 10.5001,-66.8715
   [conductor 1] finalizando viaje...
   [conductor 2] finalizando viaje...
   [conductor 1] se cerro el viaje 41 en 89736ms
   [conductor 1] finalizado: {"ok":true,"id_viaje":41,"placa":"TEST-01",...}
   [conductor 2] se cerro el viaje 42 en 89870ms
   [conductor 2] finalizado: {"ok":true,"id_viaje":42,"placa":"TEST-02",...}
```

Que veas **las dos líneas de `se cerro`** no es un error. `viaje:finalizado` se difunde
a todos los que están en la room de la ruta, así que cada socket recibe el cierre de
los dos viajes.

### Cómo confirmar que se guardó de verdad

Con el `id_viaje` que te diga el log (en la última corrida, 41 y 42):

```bash
psql -h localhost -U postgres -d Tracking -c "SELECT id_viaje, vehiculo_id, fecha_inicio, fecha_final FROM viaje WHERE id_viaje = 41;"
psql -h localhost -U postgres -d Tracking -c "SELECT count(*) FROM viaje_ubicacion WHERE id_viaje = 41;"
curl.exe -s http://localhost:3000/viajes/Tracking/Recorrido/41
```

Resultado esperado:

```
 id_viaje | vehiculo_id |  fecha_inicio  |  fecha_final   | seg
       41 | TEST-01     | 23:06:51.675   | 23:08:21.411   |  90

 puntos | primero    | ultimo
     28 | 23:06:51.675| 23:08:18.988
```

Tres cosas que tienen que cumplirse:

1. `fecha_final` **no** es null. Si lo es, el viaje quedó huérfano.
2. La duración es ~90 s, no 40. Si fuera 40, el reenganche habría abierto un viaje
   nuevo en vez de retomar el anterior, y el primero quedaría colgado para siempre.
3. Hay puntos GPS en `viaje_ubicacion`.

---

## 4. Buses cercanos

```bash
node test-buses-cercanos.js conductor_test clave123 RUTA-001 TEST-01
```

O sin argumentos, porque la seed ya dejó buses en distintas distancias:

```bash
npm run prueba:cercanos
```

### El endpoint a pelo

```
GET /viajes/Tracking/Cercanos?lactitud=10.4806&longitud=-66.9036&radio=2000
```

Parámetros:

| Parámetro | Por defecto | Rango | Qué es |
|---|---|---|---|
| `lactitud` | obligatorio | -90 a 90 | Dónde estás |
| `longitud` | obligatorio | -180 a 180 | Dónde estás |
| `radio` | 1000 | 50 a 50000 | En metros |
| `limite` | 20 | 1 a 100 | Cuántos |
| `soloOnline` | `false` | — | Solo los que tienen socket |

```bash
curl.exe -s "http://localhost:3000/viajes/Tracking/Cercanos?lactitud=10.4806&longitud=-66.9036&radio=2000"
```

Respuesta real, con los 3 buses de la seed **y** los 2 del socket a la vez:

```
5) radio 2000 m:
     0 m    TEST-05  viaje 36  online=false  vivo=false  vel=-
   556 m    TEST-01  viaje 43  online=true   vivo=true   vel=42
   556 m    TEST-06  viaje 37  online=false  vivo=false  vel=-
  1112 m    TEST-07  viaje 38  online=false  vivo=false  vel=-
  1668 m    TEST-04  viaje 44  online=true   vivo=true   vel=18
  mas_cercano -> viaje 36

6) radio 2000 m, solo online:
   556 m    TEST-01  viaje 43  online=true   vivo=true   vel=42
  1668 m    TEST-04  viaje 44  online=true   vivo=true   vel=18
  mas_cercano -> viaje 43
```

Esa comparación es justo lo que hay que mirar: los buses de la seed (`TEST-05` a
`TEST-07`) aparecen con `online=false` porque son filas de la base sin socket, y los
del script (`TEST-01`, `TEST-04`) aparecen con `online=true`, posición en vivo y
velocidad real. Con `soloOnline=true` quedan solo los dos segundos.

### Los dos campos que hay que mirar

- **`online`**: hay un socket conectado con ese viaje. Si es `false`, el bus sigue
  dando vueltas pero el teléfono perdió señal.
- **`posicion_en_vivo`**: las coordenadas vienen de memoria (el GPS de ahora), no de
  la fila del viaje en la base. Si es `false`, la posición puede tener hasta 30 s.

Por qué existen los dos: la base de datos se refresca cada 30 segundos (para no
escribir tanto), así que sola puede desfasarse. Un radio de 500 m podría dejar fuera un
bus que en realidad está a 300 m. La búsqueda usa la de memoria cuando existe, y solo
después mide y ordena.

### Ojo: "activos" y "cercanos" no significan lo mismo

Esta confusion es facil y me la comí yo:

| Endpoint | Qué cuenta |
|---|---|
| `/Tracking/Viajes-activos` | Solo los viajes **con socket conectado ahora mismo** |
| `/Tracking/Cercanos` | Los viajes **en la base** (`fecha_final IS NULL`) |

O sea: si corrés `npm run seed` y abrís el probador sin conectar ningún conductor,
`viajes:activos` te va a devolver `total: 0` aunque haya 3 viajes sembrados. No es un
error. Los viajes de la seed son filas de la base, sin sesión viva, así que
`Buses cercanos` los ve y `Viajes-activos` no.

Para verlos como "activos", abrí un viaje por socket primero. La diferencia se nota en
el `online` de la respuesta de cercanos: los de la seed salen `false`.

### Pruebas de borde

```bash
# Radio chico: solo el que está encima
curl.exe -s "http://localhost:3000/viajes/Tracking/Cercanos?lactitud=10.4806&longitud=-66.9036&radio=500"

# Solo los que tienen socket
curl.exe -s "http://localhost:3000/viajes/Tracking/Cercanos?lactitud=10.4806&longitud=-66.9036&radio=2000&soloOnline=true"

# Latitud inválida -> 400
curl.exe -s "http://localhost:3000/viajes/Tracking/Cercanos?lactitud=999&longitud=-66.9"

# Parámetro inventado -> 400
curl.exe -s "http://localhost:3000/viajes/Tracking/Cercanos?lactitud=10.48&longitud=-66.9&foo=1"
```

Las dos últimas devuelven `400` con el motivo exacto:

```json
{ "message": ["lactitud must not be greater than 90"], "statusCode": 400 }
{ "message": ["property foo should not exist"], "statusCode": 400 }
```

---

## 5. Los eventos del socket

### Los que le mandás al servidor

| Evento | Quién puede | Payload | Para qué |
|---|---|---|---|
| `ping` | cualquiera | `{ts}` | Latencia |
| `suscribir:ruta` | cualquiera | `{id_ruta}` | Mirar una ruta sin ser conductor |
| `desuscribir:ruta` | cualquiera | `{id_ruta}` | Salir de esa ruta |
| `viajes:activos` | cualquiera | — | Listar los viajes en curso |
| `viaje:start` | **Conductor** | `{id_ruta, id_vehiculo, lat, lng}` | Abrir viaje |
| `viaje:ubicacion` | **Conductor** | `{lat, lng, velocidad, rumbo, precision}` | Mandar GPS |
| `viaje:reconectar` | **Conductor** | `{id_viaje}` | Retomar tras perder señal |
| `viaje:finalizar` | **Conductor** | `{id_viaje}` | Cerrar |
| `viaje:pausa` | **Conductor** | `{id_viaje}` | Pausar |

### Los que te manda el servidor

| Evento | Qué trae |
|---|---|
| `conexion:lista` | Confirmación de que el token fue aceptado |
| `suscrito:ruta` | Te uniste a una ruta |
| `viaje:iniciado` | Tu viaje se abrió |
| `viaje:reconectado` | Retomaste el tuyo |
| `viaje:online` | Alguien conectó |
| `viaje:offline` | Alguien se cayó |
| `viaje:ubicaciones` | **Lote de posiciones** de la ruta (cada 3 s) |
| `viaje:disponible` | Entró un bus nuevo a tu ruta |
| `viaje:finalizado` | Se cerró un viaje de tu ruta |
| `viaje:descartado` | El servidor cerró tu viaje por un problema |
| `error:validacion` | El payload vino mal, con el detalle del campo |
| `error:no_autorizado` | Token malo o usuario inactivo |
| `error:no_encontrado` | Ruta o vehículo inexistente |
| `error:interno` | Falló el servidor |

### Los errores de ack

Todos los eventos de escritura aceptan un callback. La forma siempre es la misma:

```json
{ "ok": true,  "id_viaje": 41 }
{ "ok": false, "code": "validacion" }
```

Los `code` que vas a ver:

| code | Qué significa |
|---|---|
| `validacion` | Payload mal formado, o la placa ya tiene un viaje |
| `sin_viaje_activo` | Mandás GPS sin haber abierto viaje |
| `rol_sin_permiso` | Un `Admin` intentó publicar |
| `rate_limit` | Más de 30 eventos por segundo |
| `no_encontrado` | Ruta o vehículo no existe |
| `no_autorizado` | Token vencido o usuario `status: false` |

---

## 6. Probar a mano, evento por evento

Hay un probador con botones, para ver los eventos crudos sin escribir nada:

```
socket-test.html
```

Abrilo con doble click (funciona desde `file://`, porque el servidor tiene el CORS
abierto). El orden de los botones es el del ciclo de vida real:

1. **Login** — te llena el token solo.
2. **Conectar** — se autentica y empieza a mostrar todo lo que entra, con `onAny`.
3. **viaje:start** — abre el viaje con la placa de la casilla.
4. **viaje:ubicacion** — manda un punto de GPS. Tocalo varias veces seguidas y vas a
   ver aparecer `intervalo_muy_corto` (ver el problema número 1 de la sección 8).
5. **viaje:reconectar** — simula que volviste de perder señal.
6. **viaje:finalizar** — cierra el viaje.

También tiene **suscribir:ruta**, **viajes:activos** y **ping**.

Las cosas a mirar:

- Al conectar, `conexion:lista` tiene que llegar. Si en su lugar ves
  `error:no_autorizado`, el token está vencido o el usuario tiene `status: false`.
- Si probás con `obs_test` (rol Admin), `viaje:start` te va a contestar
  `{ok:false, code:"rol_sin_permiso"}` y **no** te va a dejar mover el bus.

`conexion:lista` trae un golpecito de bienvenida con el estado actual de la ruta:

```json
{
  "username": "conductor_test",
  "user_id": 12,
  "rol": "Conductor",
  "server_time": "2026-09-29T03:13:37.290Z",
  "viajes_activos": { "total": 0, "buses": [] }
}
```

Ese `total: 0` con la base llena es lo de la sección 4: son los buses **con socket**,
no los que hay en la base.

Para sacar el token a mano:

```bash
curl.exe -s -X POST http://localhost:3000/auth/login ^
  -H "Content-Type: application/json" ^
  -d "{\"username\":\"conductor_test\",\"password\":\"clave123\"}"
```

La respuesta real es:

```json
{
  "message": "Se ha Logeado Exitosamente el Usuario*",
  "control": { "user": "conductor_test", "token": "eyJhbGciOi..." }
}
```

Ojo: el token va en `control.token` y el usuario es `control.user`, que es un
**string**, no un objeto con campos.

---

## 7. Pruebas automáticas

```bash
npm test
```

Para correr solo lo del tracking:

```bash
npx jest websocket viajes/viajes.service
```

Estado actual: **52 tests pasan** en websocket y en el service de búsqueda por
cercanía. Hay specs autogenerados más viejos que siguen rotos (el `viajes.controller.spec.ts`
no mockea sus dependencias); no son de este trabajo.

Chequeos de tipos y estilo:

```bash
npx tsc --noEmit -p tsconfig.json
npx eslint src/websocket src/viajes src/dtos/viajes
```

---

## 8. Los cuatro problemas que vas a tropezar

Esto no es teoría: los cuatro los encontré probando.

### 1. El GPS pegado al `viaje:start` se pierde

```
{ "ok": true, "aceptado": false, "motivo": "intervalo_muy_corto" }
```

El server ignora un punto que llega antes de 1 segundo del anterior. Fijate que
`ok` es `true`: **eso no significa que se guardó**, hay que mirar `aceptado`. Un
teléfono real nunca manda tan seguido, pero en un script hay que esperar 1.5 s.

### 2. No se pueden abrir dos viajes en la misma placa

```
{ "ok": false, "code": "validacion" }
```

Usá `TEST-01` y `TEST-04` (o las que estén libres), no las dos la misma.

### 3. El observador no puede publicar

`obs_test` entra y ve el mapa, pero cualquier `viaje:start` o `viaje:ubicacion` le
vuelve `{ok:false, code:"rol_sin_permiso"}`. Solo el rol `Conductor` escribe. Es a
propósito: el pasajero no puede mover el bus.

### 4. `Boolean("false")` es `true` en JavaScript

Por eso `soloOnline` lleva un `@Transform` a mano en el DTO. Sin él, mandar
`?soloOnline=false` te devuelve los buses **sin** conexión, al revés de lo pedido.
Y el decorador `@IsBoolean` no es cosmético: el `ValidationPipe` global usa
`whitelist` y borra toda propiedad sin decorador, así que sin él el endpoint
devuelve `400`.

---

## 9. Cómo limpiar todo

```bash
npm run seed:limpiar
```

Y si querés también los viajes que crearon las pruebas a mano:

```bash
psql -h localhost -U postgres -d Tracking -c "DELETE FROM viaje WHERE id_viaje >= 20;"
```

`viaje_ubicacion` se borra sola: la clave foránea tiene `ON DELETE CASCADE`.

Para borrar **todos** los viajes y que la base quede limpia de history:

```bash
psql -h localhost -U postgres -d Tracking -c "TRUNCATE viaje CASCADE;"
```

Cuidado: eso se lleva por delante también `viaje_ubicacion`.

---

## 10. Problemas frecuentes

**`EADDRINUSE: puerto 3000 ya en uso`**

Ya tenés un `npm run start:dev` corriendo. No lo mates, levantá otra copia en otro
puerto:

```powershell
$env:PORT_APP="3100"
node dist/main.js
```

**`relation "viaje_ubicacion" does not exist`**

Falta el `sql/001`. El proyecto no usa migraciones, hay que correrlo a mano.

**`el seed dice que conecta pero no siembra nada**

Revisá que el `.env` tenga `DB_NAME=Tracking` y que estés en la base correcta:

```bash
psql -h localhost -U postgres -d Tracking -c "\dt"
```

**`property soloOnline should not exist`**

Este es el bug del punto 4 de la sección 8. Si te pasa, es que el DTO perdió el
decorador de validación.

**El script se queda quieto un rato**

No está colgado. Los scripts esperan a propósito: el GPS va cada 3 segundos, la caída
de red simulada cae al 40 % de la duración, y el cierre espera a que se vacíe el búfer
de la base. El de búsqueda cercana espera 32 segundos a propósito, para poder mostrarte
el antes y el después de que la base se ponga al día.
