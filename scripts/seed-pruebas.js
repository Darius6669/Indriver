/**
 * ============================================================
 *  SEED DE DATOS DE PRUEBA
 * ============================================================
 *
 *   node scripts/seed-pruebas.js            siembra los datos
 *   node scripts/seed-pruebas.js --limpiar  los borra
 *
 * Es idempotente: se puede ejecutar las veces que quieras sin
 * duplicar nada ni reventar claves foraneas.
 *
 * QUE SIEMBRA
 *   cooperativa  COOP-001 (la usa todo)
 *   persona      una por usuario
 *   usuario      3 conductores + 1 observador + 1 inactivo
 *   vehiculos    TEST-01 .. TEST-07
 *   ruta         RUTA-001 (Caracas) y RUTA-002
 *   rutacontrol  paradas de la ruta
 *   viaje        3 EN CURSO (para probar "buses cercanos")
 *   viaje        2 CERRADOS con historial GPS (para probar el recorrido)
 *
 * IMPORTANTE
 * Los 3 viajes en curso usan TEST-05, TEST-06 y TEST-07 a proposito.
 * Las placas TEST-01 a TEST-04 quedan LIBRES para que puedas abrir
 * viajes por socket sin que el server te rebote por "esa placa ya
 * tiene un viaje abierto".
 * ============================================================
 */

// Los nombres de estas variables NO son los tipicos (DB_USER, DB_PASSWORD...):
// estan en el .env del proyecto. Se leen igual que en app.module.ts.
try {
  require('dotenv').config();
} catch {
  // dotenv es opcional: si no esta, se usan los valores de abajo.
}

const { Client } = require('pg');
const bcrypt = require('bcrypt');

const PASSWORD = 'clave123';

// ------------------------------------------------------------
//  Puntos de referencia en Caracas
// ------------------------------------------------------------
const CARACAS = { lat: 10.4806, lng: -66.9036 };
// ~556 m al norte (0.005 grados de latitud)
const CERCA_500M = { lat: 10.4856, lng: -66.9036 };
// ~1112 m al norte (0.01 grados)
const MEDIO_KM = { lat: 10.4906, lng: -66.9036 };
// Lejos: ~113 km. No debe aparecer en ningun radio razonable.
const LEJOS = { lat: 11.5, lng: -66.9036 };

const USUARIOS = [
  {
    username: 'conductor_test',
    rol: 'Conductor',
    status: true,
    persona: ['V-TEST-001', 'Conductor', 'Uno', 'c1@test.indriver', '04110000001', 30],
  },
  {
    username: 'conductor2_test',
    rol: 'Conductor',
    status: true,
    persona: ['V-TEST-002', 'Conductor', 'Dos', 'c2@test.indriver', '04110000002', 35],
  },
  {
    username: 'conductor3_test',
    rol: 'Conductor',
    status: true,
    persona: ['V-TEST-003', 'Conductor', 'Tres', 'c3@test.indriver', '04110000003', 40],
  },
  {
    // Observador: entra, mira el mapa, pero NO puede publicar nada.
    username: 'obs_test',
    rol: 'Admin',
    status: true,
    persona: ['V-TEST-004', 'Observador', 'Test', 'obs@test.indriver', '04110000004', 28],
  },
  {
    // Existe para probar que un status=false NO puede niloguearse.
    username: 'inactivo_test',
    rol: 'Conductor',
    status: false,
    persona: ['V-TEST-005', 'Inactivo', 'Test', 'ina@test.indriver', '04110000005', 50],
  },
];

const VEHICULOS = ['TEST-01', 'TEST-02', 'TEST-03', 'TEST-04', 'TEST-05', 'TEST-06', 'TEST-07'];

async function main() {
  const limpiar = process.argv.includes('--limpiar');

  const client = new Client({
    host: process.env.HOST_BD || 'localhost',
    port: Number(process.env.PORT_BD || 5432),
    user: process.env.USER_NAME || 'postgres',
    password: process.env.PASSWORD_BD || '123456',
    database: process.env.DB_NAME || 'Tracking',
  });

  await client.connect();
  console.log(
    `Conectado a ${process.env.DB_NAME || 'Tracking'} ` +
      `en ${process.env.HOST_BD || 'localhost'}:${process.env.PORT_BD || 5432}`,
  );

  try {
    if (limpiar) {
      await limpiarTodo(client);
    } else {
      await sembrar(client);
    }
  } catch (error) {
    console.error('\nFALLO:', error.message);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

// ============================================================
//  SIEMBRA
// ============================================================
async function sembrar(client) {
  const hash = await bcrypt.hash(PASSWORD, 10);

  // ---- cooperativa ----
  await client.query(
    `INSERT INTO cooperativa (rif_cooperativa, nombre, ubicacion, descripcion, horario)
     VALUES ('COOP-001','Transportes Caracas','Caracas','Cooperativa de prueba','06:00-20:00')
     ON CONFLICT (rif_cooperativa) DO UPDATE SET nombre = EXCLUDED.nombre`,
  );

  // ---- personas + usuarios ----
  for (const u of USUARIOS) {
    const [cedula, nombre, apellido, email, telefono, edad] = u.persona;
    await client.query(
      `INSERT INTO persona (cedula, nombre, apellido, email, telefono, edad)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (cedula) DO UPDATE SET email = EXCLUDED.email`,
      [cedula, nombre, apellido, email, telefono, edad],
    );

    // usuario NO tiene indice unico en username (solo la PK en user_id), asi
    // que aqui no se puede usar ON CONFLICT: se busca y se actualiza a mano.
    const { rowCount: existe } = await client.query(
      `SELECT 1 FROM usuario WHERE username = $1`,
      [u.username],
    );
    if (existe > 0) {
      await client.query(
        `UPDATE usuario
            SET contrasena = $2, rol = $3, status = $4, cedula_id = $5, cooperativa_id = 'COOP-001'
          WHERE username = $1`,
        [u.username, hash, u.rol, u.status, cedula],
      );
    } else {
      await client.query(
        `INSERT INTO usuario (username, contrasena, rol, status, cedula_id, cooperativa_id)
         VALUES ($1,$2,$3,$4,$5,'COOP-001')`,
        [u.username, hash, u.rol, u.status, cedula],
      );
    }
  }

  // ---- vehiculos ----
  for (const placa of VEHICULOS) {
    await client.query(
      `INSERT INTO vehiculos (placa, modelo, color, anofabricacion, cooperativa_id)
       VALUES ($1,'bus_test','azul','2022-01-01','COOP-001')
       ON CONFLICT (placa) DO UPDATE SET cooperativa_id = EXCLUDED.cooperativa_id`,
      [placa],
    );
  }

  // ---- paradas ----
  const paradas = [
    ['Parada Sebastiana', 'Punto central', 'Av. Libertador', CARACAS.lat, CARACAS.lng],
    ['Parada La Concordia', 'Punto norte', 'Av. Caracas', MEDIO_KM.lat, MEDIO_KM.lng],
    ['Parada La Candelaria', 'Sur', 'Av. UCV', 10.4650, -66.9036],
  ];
  for (const [nombre, desc, ubi, lat, lng] of paradas) {
    // Los casteos explicitos no son cosmeticos: cuando un $1 aparece en dos
    // sitios (la lista del SELECT y el WHERE), Postgres no puede deducir de
    // que tipo es y revienta con "tipos inconsistentes".
    await client.query(
      `INSERT INTO rutacontrol (nombre, descripcion, ubicacion, lactitud, longitud)
       SELECT $1::text, $2::text, $3::text, $4::float, $5::float
        WHERE NOT EXISTS (SELECT 1 FROM rutacontrol WHERE nombre = $1::text)`,
      [nombre, desc, ubi, lat, lng],
    );
  }

  // ---- rutas ----
  const { rows: control } = await client.query(
    `SELECT id_control, nombre FROM rutacontrol ORDER BY id_control`,
  );
  const porNombre = Object.fromEntries(control.map((c) => [c.nombre, c.id_control]));

  await client.query(
    `INSERT INTO ruta (numero_ruta, nombre, descripcion, tarifa, cooperativa_id, origen_id, destino_id)
     VALUES ('RUTA-001','Ruta Norte','Caracas - Sebastiana',1500,'COOP-001',$1,$2)
     ON CONFLICT (numero_ruta) DO UPDATE SET nombre = EXCLUDED.nombre`,
    [porNombre['Parada Sebastiana'], porNombre['Parada La Concordia']],
  );
  await client.query(
    `INSERT INTO ruta (numero_ruta, nombre, descripcion, tarifa, cooperativa_id, origen_id, destino_id)
     VALUES ('RUTA-002','Ruta Sur','Caracas - Candelaria',1800,'COOP-001',$1,$2)
     ON CONFLICT (numero_ruta) DO UPDATE SET nombre = EXCLUDED.nombre`,
    [porNombre['Parada Sebastiana'], porNombre['Parada La Candelaria']],
  );

  // ---- viajes EN CURSO (sirven para "buses cercanos") ----
  // Se borran TODOS los viajes abiertos de placas TEST-*, no solo los tres de
  // abajo. Si no, una corrida de socket que quedo abierta taparia la
  // plataforma libre y el seed no seria realmente idempotente.
  await client.query(
    `DELETE FROM viaje WHERE fecha_final IS NULL AND vehiculo_id LIKE 'TEST-%'`,
  );

  const activos = [
    { placa: 'TEST-05', user: 'conductor_test', p: CARACAS, nota: 'encima de ti' },
    { placa: 'TEST-06', user: 'conductor2_test', p: CERCA_500M, nota: 'a ~556 m' },
    { placa: 'TEST-07', user: 'conductor3_test', p: MEDIO_KM, nota: 'a ~1.1 km' },
  ];
  for (const a of activos) {
    const { rows } = await client.query(`SELECT user_id FROM usuario WHERE username = $1`, [
      a.user,
    ]);
    await client.query(
      `INSERT INTO viaje (fecha_inicio, fecha_final, lactitud, longitud, user_id, vehiculo_id, ruta_id)
       VALUES (now() - interval '15 minutes', NULL, $1, $2, $3, $4, 'RUTA-001')`,
      [a.p.lat, a.p.lng, rows[0].user_id, a.placa],
    );
  }

  // ---- viajes CERRADOS con historial (sirven para el recorrido) ----
  for (const p of [0, 1]) {
    const { rows: v } = await client.query(
      `SELECT v.id_viaje, v.vehiculo_id
         FROM viaje v
         JOIN usuario u ON u.user_id = v.user_id
        WHERE u.username = $1 AND v.fecha_final IS NOT NULL AND v.ruta_id = 'RUTA-002'
        LIMIT 1`,
      [USUARIOS[p].username],
    );
    if (v.length) continue; // ya estaba

    const { rows: u } = await client.query(`SELECT user_id FROM usuario WHERE username = $1`, [
      USUARIOS[p].username,
    ]);
    const placa = p === 0 ? 'TEST-01' : 'TEST-02';
    const { rows: creado } = await client.query(
      `INSERT INTO viaje (fecha_inicio, fecha_final, lactitud, longitud, user_id, vehiculo_id, ruta_id)
       VALUES (now() - interval '3 hours', now() - interval '2 hours', 10.4700, -66.9036, $1, $2, 'RUTA-002')
       RETURNING id_viaje`,
      [u[0].user_id, placa],
    );

    // 20 puntos bajando hacia el sur, como un bus real. Los $1 y $2 se
    // castean a texto porque si no Postgres no puede deducir el tipo cuando
    // el parametro viene de una expresion aritmetica.
    for (let i = 0; i < 20; i++) {
      await client.query(
        `INSERT INTO viaje_ubicacion (id_viaje, lactitud, longitud, velocidad, rumbo, precision, recorded_at)
         VALUES ($1, $2::float, $3::float, $4::float, 180, 8,
                 now() - interval '3 hours' + ($5::int * interval '5 minutes'))`,
        [creado[0].id_viaje, 10.47 - i * 0.0003, -66.9036 - i * 0.0002, 20 + i, i * 5],
      );
    }
  }

  await resumen(client);
}

// ============================================================
//  LIMPIEZA
// ============================================================
async function limpiarTodo(client) {
  // El orden importa por las claves foraneas. viaje_ubicacion cae sola
  // por ON DELETE CASCADE.
  const r1 = await client.query(
    `DELETE FROM viaje WHERE vehiculo_id LIKE 'TEST-%' OR user_id IN (
       SELECT user_id FROM usuario WHERE username LIKE '%_test')`,
  );
  const r2 = await client.query(
    `DELETE FROM usuario WHERE username LIKE '%_test' AND username IN
       ('conductor_test','conductor2_test','conductor3_test','obs_test','inactivo_test')`,
  );
  const r3 = await client.query(`DELETE FROM persona WHERE cedula LIKE 'V-TEST-%'`);
  const r4 = await client.query(`DELETE FROM vehiculos WHERE placa LIKE 'TEST-%'`);

  console.log('\nBorrado:');
  console.log(`  viajes        ${r1.rowCount}`);
  console.log(`  usuarios      ${r2.rowCount}`);
  console.log(`  personas      ${r3.rowCount}`);
  console.log(`  vehiculos     ${r4.rowCount}`);
  console.log('\nLas rutas, paradas y la cooperativa NO se tocan: no son datos de prueba.');
  console.log('La tabla viaje_ubicacion se limpio sola por el CASCADE de la FK.');
}

// ============================================================
//  RESUMEN
// ============================================================
async function resumen(client) {
  const { rows: us } = await client.query(
    `SELECT username, rol, status FROM usuario WHERE username LIKE '%_test' ORDER BY username`,
  );
  const { rows: vi } = await client.query(
    `SELECT count(*)::int AS n FROM viaje WHERE fecha_final IS NULL`,
  );
  const { rows: vu } = await client.query(`SELECT count(*)::int AS n FROM viaje_ubicacion`);

  console.log('\n' + '='.repeat(64));
  console.log(' DATOS DE PRUEBA LISTOS');
  console.log('='.repeat(64));
  console.log(`\nUsuarios (password: ${PASSWORD})\n`);
  for (const u of us) {
    console.log(
      `  ${u.username.padEnd(18)} ${u.rol.padEnd(11)} status=${u.status}`,
    );
  }
  console.log(`\n  inactivo_test  esta en false a proposito: sirve para comprobar`);
  console.log(`                que el login lo rechaza.`);
  console.log(`\nViajes en curso: ${vi[0].n}   Puntos GPS: ${vu[0].n}`);
  console.log(`\nPlacas LIBRES para abrir viajes por socket: TEST-01, TEST-02, TEST-03, TEST-04`);
  console.log(`Placas con viaje ya abierto (bus nearby):   TEST-05, TEST-06, TEST-07`);
  console.log('\nAhora si:  node test-conductor-ws.js conductor_test clave123 RUTA-001 TEST-01');
  console.log('='.repeat(64));
}

main();
