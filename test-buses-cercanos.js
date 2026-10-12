/**
 * Prueba de "buses cerca de mi" contra el server real.
 *
 *   node test-buses-cercanos.js
 *
 * Levanta 2 conductores por socket en posiciones distintas y consulta el
 * endpoint REST con 3 radios distintos, para ver como va apareciendo y
 * desapareciendo el bus segun la distancia.
 */

const { io } = require('socket.io-client');

const BASE = process.env.BASE_URL || 'http://localhost:3000';
// Los defaults coinciden con lo que siembra `npm run seed`, asi que se puede
// correr sin argumentos:  node test-buses-cercanos.js
// La invariante es un viaje abierto por VEHICULO, asi que se puede usar el
// mismo conductor para varias placas. Por claridad el default usa un segundo
// usuario (conductor2_test) para el bus2; es opcional.
const [
  ,
  ,
  USER = 'conductor_test',
  PASS = 'clave123',
  RUTA = 'RUTA-001',
  PLACA = 'TEST-01',
  USER2 = 'conductor2_test',
  PASS2 = 'clave123',
] = process.argv;

// Yo estoy parado en Sebastiana. El bus 1 pasa justo por ahi, el bus 2 a
// ~1.1 km, y el bus 3 esta a 113 km (no deberia aparecer nunca).
const YO = { lactitud: 10.4806, longitud: -66.9036 };

const log = (...a) => console.log(...a);

async function login(username, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) throw new Error(`login fallo: ${res.status} ${await res.text()}`);
  const token = (await res.json()).control.token;
  const payload = JSON.parse(
    Buffer.from(token.split('.')[1], 'base64').toString('utf8'),
  );
  return { token, userId: payload.user_id };
}

/** El viaje lo crea el REST; el socket solo lo enciende con ese id_viaje. */
async function crearViajeRest(token, userId, placa, lat, lng) {
  const res = await fetch(`${BASE}/viajes/Crear-Viaje`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      id_user: userId,
      id_ruta: RUTA,
      id_vehiculo: placa,
      lactitud: lat,
      longitud: lng,
      fecha_inicio: new Date().toISOString(),
    }),
  });
  if (!res.ok) {
    throw new Error(`Crear-Viaje fallo (${res.status}): ${await res.text()}`);
  }
  const viaje = (await res.json()).control;
  if (!viaje?.id_viaje) throw new Error(`Respuesta sin id_viaje`);
  return viaje;
}

function conectar(token, etiqueta) {
  return new Promise((resolve) => {
    const socket = io(BASE, { transports: ['websocket'], auth: { token } });
    socket.on('error:validacion', (e) =>
      log(`  ${etiqueta} PAYLOAD INVALIDO: ${JSON.stringify(e.detalles)}`),
    );
    socket.on('error:interno', (e) => log(`  ${etiqueta} ERROR INTERNO`));
    socket.on('error:no_encontrado', (e) => log(`  ${etiqueta} NO ENCONTRADO`));
    socket.on('conexion:lista', () => resolve(socket));
    socket.on('error:no_autorizado', (e) =>
      log(`  ${etiqueta} RECHAZADO: ${e.message}`),
    );
  });
}

async function abrirViaje(socket, token, userId, placa, lat, lng) {
  let viaje;
  try {
    viaje = await crearViajeRest(token, userId, placa, lat, lng);
  } catch (e) {
    log(`  no se pudo crear viaje ${placa}: ${e.message}`);
    return { ok: false };
  }

  return new Promise((resolve) => {
    socket.emit(
      'viaje:start',
      { id_viaje: viaje.id_viaje, id_ruta: RUTA, id_vehiculo: placa, lat, lng },
      (ack) => {
        if (!ack?.ok) {
          // Ocurre si esa placa ya tiene un viaje en curso (un recorrido a la
          // vez por vehiculo). No es un fallo del server: es la regla.
          log(`  viaje RECHAZADO (${placa}): ${ack?.code ?? 'sin codigo'}`);
          return resolve(ack);
        }
        log(`  viaje abierto: ${placa} -> id ${ack.id_viaje}`);
        resolve(ack);
      },
    );
  });
}

/** Manda un punto GPS real, que es lo que mueve al bus en el mapa. */
function enviarGps(socket, etiqueta, idViaje, lat, lng, velocidad = 30) {
  return new Promise((resolve) => {
    socket.emit(
      'viaje:ubicacion',
      { id_viaje: idViaje, lat, lng, velocidad, rumbo: 0, precision: 8 },
      (ack) => {
        log(`  gps ${etiqueta}: ${JSON.stringify(ack)}`);
        resolve(ack);
      },
    );
  });
}

async function buscar(radio, soloOnline = false) {
  const qs = new URLSearchParams({
    lactitud: String(YO.lactitud),
    longitud: String(YO.longitud),
    radio: String(radio),
  });
  if (soloOnline) qs.set('soloOnline', 'true');
  const r = await fetch(`${BASE}/viajes/Tracking/Cercanos?${qs}`);
  return r.json();
}

function mostrar(titulo, body) {
  log(`\n${titulo}`);
  if (body.control.total === 0) {
    log('  (ninguno)');
    return;
  }
  for (const b of body.control.buses) {
    log(
      `  ${String(b.distancia_m).padStart(6)} m  ${b.placa}  ` +
        `viaje ${b.id_viaje}  ${b.numero_ruta}  ` +
        `online=${b.online}  vivo=${b.posicion_en_vivo}  ` +
        `vel=${b.velocidad ?? '-'}`,
    );
  }
  log(`  mas_cercano -> viaje ${body.control.mas_cercano.id_viaje}`);
}

// Viajes que ESTE script encendio (start ok). Se cierran pase lo que pase
// (fallo en medio, Ctrl+C), para no dejar viajes huerfanos en la BD que
// despues bloqueen la placa (invariante: un viaje abierto por vehiculo).
const abiertos = [];
const cerrados = new Set();

function cerrarAbiertos() {
  const pendientes = abiertos.filter((v) => !cerrados.has(v.id_viaje));
  if (pendientes.length === 0) return Promise.resolve();
  return Promise.all(
    pendientes.map(
      (v) =>
        new Promise((resolve) => {
          const listo = () => {
            cerrados.add(v.id_viaje);
            resolve();
          };
          const t = setTimeout(listo, 2000);
          v.socket.emit('viaje:finalizar', { id_viaje: v.id_viaje }, (ack) => {
            clearTimeout(t);
            log(`  cerrar ${v.etiqueta}: ${JSON.stringify(ack)}`);
            listo();
          });
        }),
    ),
  );
}

(async () => {
  const sockets = [];
  let limpiando = false;
  const limpiarYSalir = async (codigo) => {
    if (limpiando) return;
    limpiando = true;
    log('\ncerrando viajes abiertos antes de salir...');
    await cerrarAbiertos();
    for (const s of sockets) s.close();
    process.exit(codigo);
  };
  process.on('SIGINT', () => void limpiarYSalir(130));
  process.on('SIGTERM', () => void limpiarYSalir(143));

  try {
    log('='.repeat(64));
    log(' Buses cerca de mi');
    log('='.repeat(64));

    log(`\n1) login como ${USER} y ${USER2}`);
    const a = await login(USER, PASS);
    const b = await login(USER2, PASS2);

    log('\n2) creando viaje por REST y encendiendolo por socket');
    const s1 = await conectar(a.token, 'bus1');
    sockets.push(s1);
    const v1 = await abrirViaje(s1, a.token, a.userId, PLACA, YO.lactitud, YO.longitud);
    if (v1?.ok) abiertos.push({ socket: s1, etiqueta: 'bus1', id_viaje: v1.id_viaje });

    const s2 = await conectar(b.token, 'bus2');
    sockets.push(s2);
    // ~1.1 km al norte
    const v2 = await abrirViaje(s2, b.token, b.userId, 'TEST-04', 10.4906, -66.9036);
    if (v2?.ok) abiertos.push({ socket: s2, etiqueta: 'bus2', id_viaje: v2.id_viaje });

    // El bus 1 se aleja un poco. Ahora esta en memoria, no en la BD: la fila
    // viaje solo se actualiza cada 30s, y la busqueda debe usar la de memoria.
    log('\n3) mandando GPS...');
    // El server ignora un GPS que llega antes de 1 s del anterior (filtro
    // anti-flood). Un telefono real nunca manda tan seguido, asi que aqui
    // tambien se espera.
    await new Promise((r) => setTimeout(r, 1500));
    if (v1?.ok) await enviarGps(s1, 'bus1', v1.id_viaje, 10.4856, -66.9036, 42);
    await new Promise((r) => setTimeout(r, 1500));
    if (v2?.ok) await enviarGps(s2, 'bus2', v2.id_viaje, 10.4956, -66.9036, 18);
    await new Promise((r) => setTimeout(r, 4000));

    mostrar('4) radio 500 m (el bus1 se movio a ~555m, debe caer):', await buscar(500));
    mostrar('5) radio 2000 m:', await buscar(2000));
    mostrar('6) radio 2000 m, solo online:', await buscar(2000, true));

    log('\n7) esperando 32s a que el servidor baje las posiciones a la BD...');
    await new Promise((r) => setTimeout(r, 32000));
    mostrar('8) radio 500 m otra vez (ya con la BD al dia):', await buscar(500));

    log('\n9) cerrando viajes');
    await cerrarAbiertos();
    await new Promise((r) => setTimeout(r, 1000));
  } catch (error) {
    log('\nFALLO:', error.message);
    log('   cerrando los viajes que quedaron abiertos...');
    await cerrarAbiertos();
  } finally {
    for (const s of sockets) s.close();
    process.exit(0);
  }
})();
