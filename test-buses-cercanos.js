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
const [, , USER = 'conductor_test', PASS = 'clave123', RUTA = 'RUTA-001', PLACA = 'TEST-01'] =
  process.argv;

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
  return (await res.json()).control.token;
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

function abrirViaje(socket, placa, lat, lng) {
  return new Promise((resolve) => {
    socket.emit('viaje:start', { id_ruta: RUTA, id_vehiculo: placa, lat, lng }, (ack) => {
      if (!ack?.ok) {
        // Ocurre si esa placa ya tiene un viaje abierto. No es un fallo del
        // server: es la regla de "un vehiculo, un viaje a la vez".
        log(`  viaje RECHAZADO (${placa}): ${ack?.code ?? 'sin codigo'}`);
        return resolve(ack);
      }
      log(`  viaje abierto: ${placa} -> id ${ack.id_viaje}`);
      resolve(ack);
    });
  });
}

/** Manda un punto GPS real, que es lo que mueve al bus en el mapa. */
function enviarGps(socket, etiqueta, lat, lng, velocidad = 30) {
  return new Promise((resolve) => {
    socket.emit(
      'viaje:ubicacion',
      { lat, lng, velocidad, rumbo: 0, precision: 8 },
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

(async () => {
  const sockets = [];
  try {
    log('='.repeat(64));
    log(' Buses cerca de mi');
    log('='.repeat(64));

    log(`\n1) login como ${USER}`);
    const token = await login(USER, PASS);

    log('\n2) abriendo 2 viajes por socket');
    const s1 = await conectar(token, 'bus1');
    sockets.push(s1);
    await abrirViaje(s1, PLACA, YO.lactitud, YO.longitud);

    const s2 = await conectar(token, 'bus2');
    sockets.push(s2);
    // ~1.1 km al norte
    await abrirViaje(s2, 'TEST-04', 10.4906, -66.9036);

    // El bus 1 se aleja un poco. Ahora esta en memoria, no en la BD: la fila
    // viaje solo se actualiza cada 30s, y la busqueda debe usar la de memoria.
    log('\n3) mandando GPS...');
    // El server ignora un GPS que llega antes de 1 s del anterior (filtro
    // anti-flood). Un telefono real nunca manda tan seguido, asi que aqui
    // tambien se espera.
    await new Promise((r) => setTimeout(r, 1500));
    await enviarGps(s1, 'bus1', 10.4856, -66.9036, 42);
    await new Promise((r) => setTimeout(r, 1500));
    await enviarGps(s2, 'bus2', 10.4956, -66.9036, 18);
    await new Promise((r) => setTimeout(r, 4000));

    mostrar('4) radio 500 m (el bus1 se movio a ~555m, debe caer):', await buscar(500));
    mostrar('5) radio 2000 m:', await buscar(2000));
    mostrar('6) radio 2000 m, solo online:', await buscar(2000, true));

    log('\n7) esperando 32s a que el servidor baje las posiciones a la BD...');
    await new Promise((r) => setTimeout(r, 32000));
    mostrar('8) radio 500 m otra vez (ya con la BD al dia):', await buscar(500));

    log('\n9) cerrando viajes');
    for (const [i, s] of sockets.entries()) {
      s.emit('viaje:finalizar', {}, (ack) =>
        log(`  cerrar bus${i + 1}: ${JSON.stringify(ack)}`),
      );
    }
    await new Promise((r) => setTimeout(r, 3000));
  } catch (error) {
    log('\nFALLO:', error.message);
  } finally {
    for (const s of sockets) s.close();
    process.exit(0);
  }
})();
