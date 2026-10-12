/** Payload de un punto de posicion tal como lo manda el GPS del telefono. */
export interface PuntoUbicacion {
  /** Latitud en grados decimales. */
  lat: number;
  /** Longitud en grados decimales. */
  lng: number;
  /** Velocidad en km/h (null si el GPS del telefono no la reporta). */
  velocidad: number | null;
  /** Rumbo en grados (0-360) respecto al norte (null si no se reporta). */
  rumbo: number | null;
  /** Precision horizontal del fix GPS en metros (null si no se reporta). */
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
  /** id del viaje en BD. Es la clave del Map de sesiones. */
  id_viaje: number;
  /** Socket conectado que esta publicando la posicion de esta sesion. */
  socketId: string;
  /** user_id del conductor (se usa para validar pertenencia). */
  userId: number;
  /** username del conductor (para la room privada y los logs). */
  username: string;
  /** Placa del bus: el identificador real de la invariante "1 abierto por placa". */
  placa: string;
  /** Numero de ruta; agrupa los buses por room y por batch de broadcast. */
  numeroRuta: string;
  /** RIF de la cooperativa (room de cooperativa); vacio si no tiene. */
  cooperativa: string;
  /** Cuando arranco el viaje (viene de la fila creada por el REST). */
  fechaInicio: Date;
  /** Ultimo punto aceptado por el filtro GPS. */
  lastLocation: PuntoUbicacion;
  /** Epoch del ultimo UPSERT de viaje_ubicacion (marca del throttle). */
  lastDbUpdateAt: number;
  /** Hay una posicion en memoria que aun no se ha bajado a viaje. */
  pendingDbUpdate: boolean;
  /** Ultima actividad (ping o posicion); alimenta al timeout de sesion. */
  lastSeen: number;
  /** true = el telefono esta conectado y reportando. */
  online: boolean;
}

/**
 * Forma serializada de una sesion, la unica que sale por el socket. Nunca se
 * filtran refs internas de TypeORM ni buffers.
 */
export interface ViajePublico {
  /** id del viaje en BD. */
  id_viaje: number;
  /** Nombre de usuario del conductor. */
  username: string;
  /** Placa del bus. */
  placa: string;
  /** Numero de ruta al que pertenece el viaje. */
  numero_ruta: string;
  /** RIF de la cooperativa (vacio si no tiene). */
  cooperativa: string;
  /** true si el telefono esta conectado y reportando. */
  online: boolean;
  /** Fecha de inicio del viaje, ya serializada en ISO. */
  fecha_inicio: string;
  /** Ultimo punto conocido: el "hot payload" que se emite a cada ciclo. */
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
  /** id del viaje que se cerro. */
  id_viaje: number;
  /** Placa del bus. */
  placa: string;
  /** Numero de ruta del viaje. */
  numero_ruta: string;
  /** Fecha de inicio en ISO. */
  fecha_inicio: string;
  /** Fecha de cierre en ISO. */
  fecha_final: string;
  /** Duración del viaje en milisegundos. */
  duracionMs: number;
  /** Ultimo punto reportado antes de cerrar. */
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

/** Cada cuanto corre el tick que refresca la ultima posicion en viaje. */
export const TICK_INTERVAL_MS = 10_000;

/** Cada cuanto se refresca la fila de viaje_ubicacion (la ultima posicion). */
export const DB_UPDATE_INTERVAL_MS = 30_000;

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

/**
 * Lee un numero del entorno con default, tope minimo y saneado de NaN.
 * @returns el valor de `nombre`, recortado a [minimo, maximo], o porDefecto.
 */
function numEnv(
  nombre: string,
  porDefecto: number,
  minimo?: number,
  maximo?: number,
): number {
  const crudo = process.env[nombre];
  const n = crudo === undefined ? porDefecto : Number(crudo);
  // Si la variable viene vacia o con basura, se queda el default.
  if (!Number.isFinite(n)) return porDefecto;
  if (minimo !== undefined && n < minimo) return minimo;
  if (maximo !== undefined && n > maximo) return maximo;
  return n;
}

// ===== Rooms =====
// Todo sale del viaje: no se agrego ninguna columna nueva a la BD.

/** Room privada de un conductor (recibe los cierres de sus viajes). */
export const roomConductor = (username: string) => `conductor:${username}`;
/** Room publica de una ruta (los pasajeros que la miran). */
export const roomRuta = (numeroRuta: string) => `ruta:${numeroRuta}`;
/** Room de una cooperativa (los buses de esa flota). */
export const roomCooperativa = (rif: string) => `cooperativa:${rif}`;
/** Room puntual de un viaje (el conductor de ese bus). */
export const roomViaje = (idViaje: number) => `viaje:${idViaje}`;
