/**
 * Simulador del telefono del conductor contra el gateway real.
 *
 *   node test-conductor-ws.js
 *
 * Requiere el server arriba (npm run start:dev) y las tablas creadas:
 *   psql -U postgres -d indriver -f sql/001_crear_viaje_ubicacion.sql
 *
 * Uso:
 *   node test-conductor-ws.js <usuario> <password> [ruta] [placa] [vehiculo2]
 *
 * Variables de entorno opcionales:
 *   BASE_URL                 http://localhost:3000
 *   OBS_USER / OBS_PASS      credenciales de un 2do usuario (cualquier rol) que
 *                             se suscribe a la ruta como observador.
 *                             Sin esto el script corre en modo 1 conductor.
 *
 * Todo lo que se ve aqui es el contrato que el movil tiene que cumplir.
 */

const { io } = require('socket.io-client');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const [, , USER, PASS, RUTA, PLACA, RUTA2, PLACA2] = process.argv;

if (!USER || !PASS) {
  console.error(
    'Uso: node test-conductor-ws.js <usuario> <password> [ruta] [placa] [ruta2] [placa2]',
  );
  process.exit(1);
}

const NUMERO_RUTA = RUTA || 'R-01';
const PLACA_VEHICULO = PLACA || 'ABC123';
const NUMERO_RUTA_2 = RUTA2 || '';
const PLACA_VEHICULO_2 = PLACA2 || '';

// Caracas, Sebastiana -> El Paraiso. Sustituir por una ruta real.
const RUTA_POR_DEFECTO = [
  [10.4806, -66.9036],
  [10.4852, -66.8971],
  [10.4903, -66.8888],
  [10.4948, -66.8802],
  [10.5001, -66.8715],
  [10.5049, -66.8621],
];

const INTERVALO_GPS_MS = 3000; // cada cuanto "lee" el GPS el movil
const INTERVALO_PING_MS = 15000;
const DURACION_MS = Number(process.env.DURACION_SEG ?? 90) * 1000;

let paso = 0;

const log = (...args) => console.log(...args);
const logConductor = (msg, n = 1) => log(`   [conductor ${n}]`, msg);
const logObs = (msg) => log('  [observador]', msg);

async function login(username, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    throw new Error(`Login de "${username}" fallo (${res.status}): ${await res.text()}`);
  }
  const body = await res.json();
  const token = body?.control?.token;
  if (!token) throw new Error(`La respuesta no trae token: ${JSON.stringify(body)}`);
  return { token, rol: decode(token).rol };
}

function decode(token) {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  } catch {
    return {};
  }
}

// ==================================================================
//  CONDUCTOR
// ==================================================================

/**
 * @param n numero de conductor, solo para las lineas de log.
 * @returns { socket, estado }
 */
function conectarConductor(token, numRuta, placa, n = 1) {
  logConductor(`conectando socket con handshake.auth.token (ruta ${numRuta})`, n);
  // El token va en el handshake: es lo que valida el gateway antes de
  // registrar los handlers.
  const socket = io(BASE, {
    transports: ['websocket'],
    auth: { token },
    reconnectionDelay: 2000,
  });

  const estado = { socket, idViaje: null, paso: 0, online: false };

  socket.on('connect', () =>
    logConductor(`conectado (${socket.id})`, n),
  );

  socket.on('connect_error', (err) =>
    logConductor(`error de conexion: ${err.message}`, n),
  );

  socket.on('conexion:lista', (data) => {
    logConductor(
      `autenticado como ${data.username} | viajes en curso: ${data.viajes_activos.total}`,
      n,
    );
    // Decision clave del movil: si ya teniamos un viaje, NO se abre otro.
    // Abrir uno nuevo sobre una sesion viva la dejaria con fecha_final NULL
    // para siempre en la BD; lo correcto es reengancharse.
    setTimeout(() => {
      if (estado.idViaje) reenganchar(estado, n);
      else abrirViaje(estado, numRuta, placa, n);
    }, 300);
  });

  socket.on('error:no_autorizado', (e) =>
    logConductor(`RECHAZADO [${e.code}] ${e.message}`, n),
  );
  socket.on('error:validacion', (e) =>
    logConductor(`payload invalido: ${JSON.stringify(e.detalles)}`, n),
  );
  socket.on('error:no_encontrado', (e) =>
    logConductor(`no encontrado: ${e.message}`, n),
  );
  socket.on('error:interno', (e) =>
    logConductor(`error interno: ${e.message}`, n),
  );

  socket.on('viaje:disponible', (b) =>
    logConductor(`otro bus entro en la ruta: ${b.placa}`, n),
  );
  socket.on('viaje:finalizado', (b) =>
    logConductor(`se cerro el viaje ${b.id_viaje} en ${b.duracionMs}ms`, n),
  );
  socket.on('viaje:descartado', (b) =>
    logConductor(`el servidor descarto el viaje ${b.id_viaje} (${b.motivo ?? ''})`, n),
  );

  return estado;
}

function abrirViaje(estado, numRuta, placa, n) {
  const [lat, lng] = RUTA_POR_DEFECTO[0];
  logConductor(`abriendo viaje en la ruta ${numRuta} / placa ${placa}`, n);

  estado.socket.emit(
    'viaje:start',
    { id_ruta: numRuta, id_vehiculo: placa, lat, lng },
    (ack) => {
      if (!ack?.ok) {
        logConductor(`no se pudo abrir el viaje: ${JSON.stringify(ack)}`, n);
        return;
      }
      estado.idViaje = ack.id_viaje;
      estado.paso = 1;
      estado.online = true;
      logConductor(`viaje ${estado.idViaje} abierto (${ack.placa} / ${ack.numero_ruta})`, n);
      arrancarGps(estado, n);
    },
  );
}

function arrancarGps(estado, n) {
  // Tras un reenganche llega otro llamado: sin este guarda se accumulan dos
  // intervalos y el GPS reporta al doble de velocidad.
  if (estado.gpsArrancado) return;
  estado.gpsArrancado = true;

  // El GPS del movil: cada 3s manda su posicion. El server no inventa nada.
  estado.timerGps = setInterval(() => {
    if (!estado.socket.connected || !estado.idViaje) return;
    if (estado.paso >= RUTA_POR_DEFECTO.length - 1) estado.paso = 0;
    const [lat, lng] = RUTA_POR_DEFECTO[estado.paso];
    estado.paso++;

    estado.socket.emit(
      'viaje:ubicacion',
      {
        id_viaje: estado.idViaje,
        lat: Number((lat + Math.random() * 0.0002).toFixed(6)),
        lng: Number((lng + Math.random() * 0.0002).toFixed(6)),
        velocidad: Math.round(20 + Math.random() * 40),
        rumbo: Math.round(Math.random() * 359),
        precision: Math.round(5 + Math.random() * 15),
        ts: Date.now(),
      },
      (ack) => {
        if (!ack?.ok) {
          logConductor(`ubicacion rechazada: ${JSON.stringify(ack)}`, n);
          return;
        }
        // "sin_movimiento" / "intervalo_muy_corto" son filtros normales del GPS,
        // no errores. El buffer del servidor es el que decide.
        logConductor(
          `ubicacion ${ack.aceptado ? 'guardada' : `filtrada (${ack.motivo})`} ` +
            `${lat},${lng}`,
          n,
        );
      },
    );
  }, INTERVALO_GPS_MS);

  // Heartbeat: prueba que la conexion sigue viva aunque el bus este parado.
  estado.timerPing = setInterval(() => {
    if (!estado.socket.connected) return;
    estado.socket.emit('ping', { ts: Date.now() }, (ack) => {
      const rtt = ack.cliente_ts ? Date.now() - ack.cliente_ts : '?';
      logConductor(`ping -> rtt ${rtt}ms`, n);
    });
  }, INTERVALO_PING_MS);
}

/**
 * Corta el GPS y el heartbeat. Un movil real hace exactamente esto al cerrar
 * el viaje: si se dejaran corriendo, cada punto rebotaria con
 * "sin_viaje_activo" y el log se llenaria de ruido.
 */
function detenerGps(estado) {
  if (estado.timerGps) clearInterval(estado.timerGps);
  if (estado.timerPing) clearInterval(estado.timerPing);
  estado.timerGps = null;
  estado.timerPing = null;
  estado.gpsArrancado = false;
}

/**
 * Retoma el viaje que ya existia. Esto es lo que hace el movil al recuperar
 * señal: NO abre un viaje nuevo, porque eso dejaria el anterior huérfano con
 * fecha_final NULL para siempre en la BD.
 */
function reenganchar(estado, n) {
  logConductor(`reenganchandome al viaje ${estado.idViaje}...`, n);
  estado.socket.emit('viaje:reconectar', { id_viaje: estado.idViaje }, (ack) => {
    if (!ack?.ok) {
      logConductor(
        `NO se pudo reenganchar (${JSON.stringify(ack)}): se abre uno nuevo`,
        n,
      );
      estado.idViaje = null;
      return abrirViaje(estado, estado.numRuta, estado.placa, n);
    }
    estado.online = true;
    logConductor(`REENGANCHADO al viaje ${ack.id_viaje} (${ack.placa})`, n);
    arrancarGps(estado, n);
  });
}

/**
 * Simula la caida de senal: el socket se va, el viaje sigue abierto en el
 * server. Al volver, `conexion:lista` dispara el reenganche de arriba.
 */
function simularCaidaDeRed(estado, numRuta, placa, n) {
  logConductor('--- se cae la red (el viaje NO se cierra) ---', n);
  estado.numRuta = numRuta;
  estado.placa = placa;
  estado.online = false;
  estado.socket.disconnect();

  setTimeout(() => {
    logConductor('vuelve la senal...', n);
    estado.socket.connect();
  }, 5000);
}

// ==================================================================
//  OBSERVADOR (se suscribe a la ruta; cualquier rol autenticado)
// ==================================================================

function conectarObservador(token, numRuta) {
  logObs('conectando y suscribiendo a la ruta');
  const socket = io(BASE, { transports: ['websocket'], auth: { token } });

  socket.on('connect', () => {
    logObs('conectado');
    socket.emit('suscribir:ruta', { numero_ruta: numRuta }, (ack) => {
      if (!ack?.ok) return logObs(`no se pudo suscribir: ${JSON.stringify(ack)}`);
      logObs(`suscrito a ${ack.numero_ruta}, ${ack.total} buses en ruta`);
    });
  });

  socket.on('connect_error', (e) => logObs(`error de conexion: ${e.message}`));
  socket.on('error:no_autorizado', (e) => logObs(`[${e.code}] ${e.message}`));
  socket.on('error:validacion', (e) =>
    logObs(`payload invalido: ${JSON.stringify(e.detalles)}`),
  );
  socket.on('error:interno', (e) => logObs(`error interno: ${e.message}`));

  socket.on('suscrito:ruta', (s) => {
    logObs(`snapshot: ${s.total} bus(es) en la ruta`);
    for (const b of s.buses) {
      const u = b.ultima_ubicacion;
      logObs(`  - ${b.placa} @ ${u.lat},${u.lng} (online=${b.online})`);
    }
  });

  // Evento batched: UN mensaje con TODOS los buses de la ruta. Esta es la via
  // normal cuando hay varios vehiculos; `viaje:ubicacion` es el caso de 1 bus.
  socket.on('viaje:ubicaciones', (data) => {
    const partes = data.buses.map(
      (b) =>
        `#${b.id_viaje} @${b.lat.toFixed(4)},${b.lng.toFixed(4)}` +
        `${b.velocidad != null ? ` ${b.velocidad}km/h` : ''}`,
    );
    logObs(`${data.numero_ruta}: ${partes.join(' | ')}`);
  });

  // Evento individual, para cuando el cliente quiere el detalle de un bus.
  socket.on('viaje:ubicacion', (u) =>
    logObs(
      `#${u.id_viaje} @${u.lat},${u.lng} | ${u.velocidad ?? '?'} km/h | rumbo ${u.rumbo ?? '?'}deg`,
    ),
  );
  socket.on('viaje:disponible', (b) => logObs(`llego un bus: ${b.placa}`));
  socket.on('viaje:online', (e) => logObs(`el bus ${e.id_viaje} volvio`));
  socket.on('viaje:offline', (e) => logObs(`el bus ${e.id_viaje} se perdio`));
  socket.on('viaje:finalizado', (b) => logObs(`termino el viaje ${b.id_viaje}`));

  return socket;
}

// ==================================================================

(async () => {
  const sockets = [];
  try {
    log('='.repeat(64));
    log(' Simulador de tracking GPS - indriver');
    log('='.repeat(64));

    log(`\n1) POST ${BASE}/auth/login  como "${USER}"`);
    const a = await login(USER, PASS);
    log(`   OK  rol=${a.rol}`);
    sockets.push(conectarConductor(a.token, NUMERO_RUTA, PLACA_VEHICULO, 1));

    // 2do vehiculo en la MISMA ruta, para ver el batching de verdad.
    if (NUMERO_RUTA_2 && PLACA_VEHICULO_2) {
      log(`\n1b) login del 2do conductor para otra placa en la MISMA ruta`);
      const b = await login(process.env.USER2 || USER, process.env.PASS2 || PASS);
      log(`   OK  rol=${b.rol}`);
      sockets.push(
        conectarConductor(b.token, NUMERO_RUTA_2, PLACA_VEHICULO_2, 2),
      );
    }

    // Observador: necesita token, pero su rol da igual (no puede publicar).
    if (process.env.OBS_USER && process.env.OBS_PASS) {
      log(`\n2) login del observador "${process.env.OBS_USER}"`);
      const o = await login(process.env.OBS_USER, process.env.OBS_PASS);
      log(`   OK  rol=${o.rol}`);
      sockets.push(conectarObservador(o.token, NUMERO_RUTA));
    } else {
      log(
        '\n2) sin OBS_USER/OBS_PASS: corre sin observador (no hay modo anonimo,',
      );
      log('   a proposito: ver el mapa tambien requiere token).');
    }

    // Caida de red al 40% de la corrida. Importante que NO coincida con el
    // cierre: si el socket esta caido cuando se finaliza, no hay ack y parece
    // un bug del servidor cuando es del guion.
    setTimeout(
      () => {
        if (sockets[0]?.idViaje) {
          simularCaidaDeRed(sockets[0], NUMERO_RUTA, PLACA_VEHICULO, 1);
        }
      },
      Math.floor(DURACION_MS * 0.4),
    );

    // Cierra los viajes al final para que se vea el flush + fecha_final.
    setTimeout(() => {
      for (const [i, estado] of sockets.entries()) {
        if (!estado?.idViaje) continue;
        logConductor('finalizando viaje...', i + 1);
        estado.socket.emit('viaje:finalizar', { id_viaje: estado.idViaje }, (ack) => {
          logConductor(`finalizado: ${JSON.stringify(ack)}`, i + 1);
          // El bus ya no manda GPS ni ping: se apagaron al cerrar el viaje.
          detenerGps(estado);
        });
      }

      const id = sockets[0]?.idViaje;
      log('\nChequea en psql:');
      log(`  SELECT * FROM viaje WHERE id_viaje = ${id};`);
      log(`  SELECT * FROM viaje_ubicacion WHERE id_viaje = ${id} ORDER BY recorded_at;`);
      log(`  GET ${BASE}/viajes/Tracking/Recorrido/${id}`);

      setTimeout(() => {
        for (const s of sockets) s.socket?.close?.();
        process.exit(0);
      }, 1500);
    }, DURACION_MS);
  } catch (error) {
    console.error('\nFALLO:', error.message);
    process.exit(1);
  }
})();
