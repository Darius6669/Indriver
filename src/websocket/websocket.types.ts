/** Payload de un punto de posicion tal como lo manda el GPS del telefono. */
export interface PuntoUbicacion {
  lat: number;
  lng: number;
  velocidad: number | null;
  rumbo: number | null;
  precision: number | null;
  /** epoch ms. Prioridad: reloj del telefono > reloj del servidor */
  ts: number;
}

/**
 * Sesion en memoria de un viaje en curso. Es la "verdad caliente": se actualiza
 * en cada ping del telefono y nunca bloquea esperando a Postgres.
 *
 * Clave: id_viaje. El identificador real del bus es la placa del vehiculo
 * (vehiculos.placa), no un string inventado.
 */
export interface ViajeSession {
  id_viaje: number;
  socketId: string;
  userId: number;
  username: string;
  placa: string;
  numeroRuta: string;
  cooperativa: string;
  fechaInicio: Date;
  lastLocation: PuntoUbicacion;
  /** Puntos pendientes de persistir en viaje_ubicacion. */
  buffer: PuntoUbicacion[];
  lastFlushAt: number;
  lastDbUpdateAt: number;
  /** Hay una posicion en memoria que aun no se ha bajado a viaje. */
  pendingDbUpdate: boolean;
  lastSeen: number;
  online: boolean;
}

/**
 * Forma serializada de una sesion, la unica que sale por el socket. Nunca se
 * filtran refs internas de TypeORM ni buffers.
 */
export interface ViajePublico {
  id_viaje: number;
  username: string;
  placa: string;
  numero_ruta: string;
  cooperativa: string;
  online: boolean;
  fecha_inicio: string;
  ultima_ubicacion: {
    lat: number;
    lng: number;
    velocidad: number | null;
    rumbo: number | null;
    precision: number | null;
    ts: number;
  };
}

/** Payload de `viaje:finalizar`. */
export interface ViajeFinalizado {
  id_viaje: number;
  placa: string;
  numero_ruta: string;
  fecha_inicio: string;
  fecha_final: string;
  duracionMs: number;
  ultima_ubicacion: ViajePublico['ultima_ubicacion'];
}
// ===== Sincronizacion =====

/**
 * Cada cuanto se agrupan las posiciones y se difunden a las rooms. El punto es
 * NO emitir en cada ping: el costo dominante de socket.io es por mensaje, no
 * por byte, asi que 1 mensaje por ruta cada 3s le gana a 100 mensajes sueltos.
 */
export const BROADCAST_INTERVAL_MS = numEnv(
  'WS_BROADCAST_MS',
  3_000,
  500, // 500ms = como mucho 2 actualizaciones/seg
);

/** Cada cuanto se vuelca el buffer a viaje_ubicacion. */
export const FLUSH_INTERVAL_MS = 10_000;

/** Cada cuanto se refresca viaje.lactitud/longitud (la ultima posicion). */
export const DB_UPDATE_INTERVAL_MS = 30_000;

/** Si el buffer llega a esto, se fuerza el flush aunque falte el intervalo. */
export const MAX_BUFFER_PUNTOS = 50;

/**
 * Distancia minima entre dos puntos para considerarlos del mismo lugar. El GPS
 * del telefono vibra y manda valores casi identicos varias veces por segundo.
 */
export const MIN_DISTANCIA_M = 10;

/** Dos puntos con menos de esto de diferencia se consideran el mismo fix. */
export const MIN_INTERVAL_PUNTO_MS = 1_000;

/** Sin ping en este tiempo, la sesion se marca offline (LTE, tunnels, etc). */
export const SESION_TIMEOUT_MS = 45_000;

/**
 * Un viaje abierto mas de esto y offline se descarta del Map. Sin esto, un
 * chofer que cierra la app a la fuerza filtra memoria para siempre.
 */
export const MAX_SESION_HORAS = 24;

/** Eventos por segundo permitidos por socket, con rafaga de 2x. */
export const RATE_LIMIT_POR_SEGUNDO = 30;
export const RATE_LIMIT_RAFAGA = 60;

/** Lee un numero del entorno con default, tope minimo y saneado de NaN. */
function numEnv(
  nombre: string,
  porDefecto: number,
  minimo?: number,
  maximo?: number,
): number {
  const crudo = process.env[nombre];
  const n = crudo === undefined ? porDefecto : Number(crudo);
  if (!Number.isFinite(n)) return porDefecto;
  if (minimo !== undefined && n < minimo) return minimo;
  if (maximo !== undefined && n > maximo) return maximo;
  return n;
}

// ===== Rooms =====
// Todo sale del viaje: no se agrego ninguna columna nueva a la BD.

export const roomConductor = (username: string) => `conductor:${username}`;
export const roomRuta = (numeroRuta: string) => `ruta:${numeroRuta}`;
export const roomCooperativa = (rif: string) => `cooperativa:${rif}`;
export const roomViaje = (idViaje: number) => `viaje:${idViaje}`;
