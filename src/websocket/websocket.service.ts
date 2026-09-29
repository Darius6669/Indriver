import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Server } from 'socket.io';
import { ViajesEntity } from 'src/entidades/Viajes.entity';
import { ViajeUbicacionEntity } from 'src/entidades/ViajeUbicacion.entity';
import { RutaEntity } from 'src/entidades/ruta.entity';
import { VehiculosEntity } from 'src/entidades/vehiculos.entity';
import {
  CerrarViajeWsDto,
  IniciarViajeWsDto,
  UbicacionWsDto,
} from 'src/dtos/viajes/TrackingWs.dto';
import {
  BROADCAST_INTERVAL_MS,
  DB_UPDATE_INTERVAL_MS,
  FLUSH_INTERVAL_MS,
  MAX_BUFFER_PUNTOS,
  MAX_SESION_HORAS,
  MIN_DISTANCIA_M,
  MIN_INTERVAL_PUNTO_MS,
  PuntoUbicacion,
  roomConductor,
  roomCooperativa,
  roomRuta,
  roomViaje,
  SESION_TIMEOUT_MS,
  ViajeFinalizado,
  ViajePublico,
  ViajeSession,
} from './websocket.types';

/** Radio medio terrestre en metros, para la formula de haversine. */
const R_TIERRA_M = 6_371_000;

/** Fila lista para el INSERT masivo en viaje_ubicacion. */
interface FilaHistorial {
  id_viaje: number;
  lactitud: number;
  longitud: number;
  velocidad: number | null;
  rumbo: number | null;
  precision: number | null;
  recorded_at: Date;
}

@Injectable()
export class WebsocketService implements OnModuleDestroy {
  private readonly logger = new Logger('TrackingService');

  /**
   * Se inyecta desde el gateway en afterInit. El servicio lo usa para emitir
   * a las rooms, pero jamas toca un Socket concreto: asi la logica de tracking
   * no depende de socket.io.
   */
  private server?: Server;

  private sesiones = new Map<number, ViajeSession>();
  private indicePorSocket = new Map<string, number>();

  /**
   * Puntos que aun no se emitieron, agrupados por ruta. Es lo que permite el
   * batching: en vez de 1 mensaje por bus, 1 mensaje por ruta.
   */
  private pendientesBroadcast = new Map<string, ViajeSession[]>();
  /** Sesiones que cambiaron y hay que refrescar en la tabla viaje. */
  private pendientesViaje = new Set<number>();

  private flushTimer?: NodeJS.Timeout;
  private broadcastTimer?: NodeJS.Timeout;
  private reaperTimer?: NodeJS.Timeout;

  constructor(
    @InjectRepository(ViajesEntity)
    private viajesRepository: Repository<ViajesEntity>,
    @InjectRepository(ViajeUbicacionEntity)
    private ubicacionesRepository: Repository<ViajeUbicacionEntity>,
    @InjectRepository(RutaEntity)
    private rutaRepository: Repository<RutaEntity>,
    @InjectRepository(VehiculosEntity)
    private vehiculosRepository: Repository<VehiculosEntity>,
  ) {}

  setServer(server: Server) {
    this.server = server;
    this.iniciarTimers();
  }

  // ==================================================================
  //  TIMERS
  // ==================================================================

  private iniciarTimers() {
    // Un unico timer global de cada tipo en vez de uno por sesion: es la forma
    // de evitar los intervalos huerfanos que dejaba el codigo anterior.
    if (!this.flushTimer) {
      this.flushTimer = setInterval(() => void this.tick(), FLUSH_INTERVAL_MS);
    }
    if (!this.broadcastTimer) {
      this.broadcastTimer = setInterval(
        () => this.difundirPendientes(),
        BROADCAST_INTERVAL_MS,
      );
    }
    if (!this.reaperTimer) {
      // Barato: solo mira timestamps, no toca la BD.
      this.reaperTimer = setInterval(() => this.reaper(), 60_000);
    }
    this.logger.log(
      `Timers: broadcast ${BROADCAST_INTERVAL_MS}ms | flush ${FLUSH_INTERVAL_MS}ms | ` +
        `refresco viaje ${DB_UPDATE_INTERVAL_MS}ms`,
    );
  }

  // ==================================================================
  //  CICLO DE VIDA DEL VIAJE
  // ==================================================================

  async iniciarViaje(
    userId: number,
    username: string,
    socketId: string,
    dto: IniciarViajeWsDto,
  ): Promise<ViajeSession> {
    const [ruta, vehiculo] = await Promise.all([
      this.rutaRepository.findOne({ where: { numero_ruta: dto.id_ruta } }),
      this.vehiculosRepository.findOne({ where: { placa: dto.id_vehiculo } }),
    ]);

    if (!ruta) {
      throw new NotFoundException(`La ruta ${dto.id_ruta} no existe`);
    }
    if (!vehiculo) {
      throw new NotFoundException(`El vehiculo ${dto.id_vehiculo} no existe`);
    }

    const ahora = new Date();
    const punto: PuntoUbicacion = {
      lat: dto.lat,
      lng: dto.lng,
      velocidad: null,
      rumbo: null,
      precision: null,
      ts: dto.fecha_inicio ? dto.fecha_inicio.getTime() : ahora.getTime(),
    };

    const viaje = this.viajesRepository.create({
      fecha_inicio: dto.fecha_inicio ?? ahora,
      fecha_final: null, // NULL = en curso. Se llena en finalizarViaje.
      lactitud: dto.lat,
      longitud: dto.lng,
      usuario: { user_id: userId },
      vehiculo: { placa: dto.id_vehiculo },
      ruta: { numero_ruta: dto.id_ruta },
      incidencia: dto.incidencia_id
        ? { incidencias_id: dto.incidencia_id }
        : null,
    });

    const creado = await this.viajesRepository.save(viaje);

    const sesion: ViajeSession = {
      id_viaje: creado.id_viaje,
      socketId,
      userId,
      username,
      placa: dto.id_vehiculo,
      numeroRuta: ruta.numero_ruta,
      cooperativa: ruta.cooperativa?.rif_cooperativa ?? '',
      fechaInicio: ahora,
      lastLocation: punto,
      buffer: [punto],
      lastFlushAt: Date.now(),
      lastDbUpdateAt: Date.now(),
      pendingDbUpdate: false,
      lastSeen: Date.now(),
      online: true,
    };

    // Si el mismo socket reintenta, se limpia la sesion anterior para no dejar
    // una sesion huerfana emitiendo en segundo plano.
    this.descartarSesionesDelSocket(socketId);
    this.registrar(sesion);

    this.logger.log(
      `Viaje ${sesion.id_viaje} iniciado por ${username} (${sesion.placa} / ruta ${sesion.numeroRuta})`,
    );

    // La room del viaje la une despues el gateway; aqui se avisa a los que ya
    // estaban mirando esa ruta de que aparecio un bus nuevo.
    this.server
      ?.to(roomRuta(sesion.numeroRuta))
      .emit('viaje:disponible', this.aPublica(sesion));

    return sesion;
  }

  async finalizarViaje(
    sesion: ViajeSession,
    dto: CerrarViajeWsDto,
  ): Promise<ViajeFinalizado> {
    // Primero se baja todo, si no se pierde el tramo final del viaje.
    await this.flushHistorial(true);
    await this.persistirUltimaUbicacion(sesion, true);

    const fechaFinal = dto.fecha_final ?? new Date();
    await this.viajesRepository.update(
      { id_viaje: sesion.id_viaje },
      { fecha_final: fechaFinal },
    );

    const payload: ViajeFinalizado = {
      id_viaje: sesion.id_viaje,
      placa: sesion.placa,
      numero_ruta: sesion.numeroRuta,
      fecha_inicio: sesion.fechaInicio.toISOString(),
      fecha_final: fechaFinal.toISOString(),
      duracionMs: fechaFinal.getTime() - sesion.fechaInicio.getTime(),
      ultima_ubicacion: this.aPunto(sesion),
    };

    this.eliminar(sesion.id_viaje);

    this.server
      ?.to(roomViaje(payload.id_viaje))
      .emit('viaje:finalizado', payload);
    this.server?.to(roomRuta(sesion.numeroRuta)).emit('viaje:cerrado', payload);
    this.server
      ?.to(roomConductor(sesion.username))
      .emit('viaje:finalizado', payload);

    this.logger.log(
      `Viaje ${payload.id_viaje} finalizado (${Math.round(payload.duracionMs / 1000)}s)`,
    );

    return payload;
  }

  /**
   * El socket se cayo. NO se cierra el viaje: con senal LTE mala el chofer
   * reconecta en segundos y cerrarle el viaje perderia el dato. Solo se marca
   * offline para que el mapa muestre el bus en gris.
   */
  marcarSesionOffline(socketId: string): ViajeSession[] {
    const afectadas: ViajeSession[] = [];
    for (const idViaje of this.sesionesDelSocket(socketId)) {
      const sesion = this.sesiones.get(idViaje);
      if (sesion) {
        sesion.online = false;
        sesion.lastSeen = Date.now();
        afectadas.push(sesion);
        // Que no se pierda lo ultimo que reporto el telefono.
        this.encolarHistorial(sesion);
        this.encolarBroadcast(sesion);
      }
    }
    this.indicePorSocket.delete(socketId);
    void this.flushHistorial(true);
    this.difundirPendientes();
    return afectadas;
  }

  // ==================================================================
  //  UBICACIONES
  // ==================================================================

  /**
   * @returns `aceptado:false` con un motivo cuando el punto se descarto. El
   * cliente no es un error: es el GPS enviando ruido, y hay que filtrarlo.
   */
  registrarUbicacion(
    sesion: ViajeSession,
    dto: UbicacionWsDto,
  ): { aceptado: boolean; motivo?: string; ts: number } {
    if (!sesion.online) {
      sesion.online = true;
      this.sesionVolvio(sesion);
    }

    const punto: PuntoUbicacion = {
      lat: dto.lat,
      lng: dto.lng,
      velocidad: dto.velocidad ?? null,
      rumbo: dto.rumbo ?? null,
      precision: dto.precision ?? null,
      ts: dto.ts ?? Date.now(),
    };

    // Filtro 1: el telefono dispara mas rapido de lo que el GPS real puede
    // distinguir dos posiciones.
    if (punto.ts - sesion.lastLocation.ts < MIN_INTERVAL_PUNTO_MS) {
      sesion.lastSeen = Date.now();
      return { aceptado: false, motivo: 'intervalo_muy_corto', ts: punto.ts };
    }

    // Filtro 2: mismo lugar. El bus esta parado o en un semaforo, la posicion
    // no aporta nada al historial ni al mapa.
    const metros = this.distanciaMetros(
      sesion.lastLocation.lat,
      sesion.lastLocation.lng,
      punto.lat,
      punto.lng,
    );
    if (metros < MIN_DISTANCIA_M) {
      sesion.lastSeen = Date.now();
      return { aceptado: false, motivo: 'sin_movimiento', ts: punto.ts };
    }

    sesion.lastLocation = punto;
    sesion.lastSeen = Date.now();
    sesion.pendingDbUpdate = true;
    this.pendientesViaje.add(sesion.id_viaje);
    sesion.buffer.push(punto);
    this.encolarHistorial(sesion);
    this.encolarBroadcast(sesion);

    return { aceptado: true, ts: punto.ts };
  }

  /**
   * Acumula la sesion para el proximo broadcast. Si el buffer de una sesion se
   * desborda, se fuerza el flush: antes eso era 1 INSERT por cada 50 pings.
   */
  private encolarHistorial(sesion: ViajeSession) {
    if (sesion.buffer.length >= MAX_BUFFER_PUNTOS) {
      void this.flushHistorial(true);
    }
  }

  private encolarBroadcast(sesion: ViajeSession) {
    const cola = this.pendientesBroadcast.get(sesion.numeroRuta);
    if (cola) {
      // La misma sesion solo aparece una vez por ciclo.
      if (!cola.includes(sesion)) cola.push(sesion);
    } else {
      this.pendientesBroadcast.set(sesion.numeroRuta, [sesion]);
    }
  }

  /**
   * Un emit por RUTA, no por bus. Con 100 buses en 10 rutas son 10 mensajes
   * en vez de 100: el costo por mensaje de socket.io (enrutado, framing, ack)
   * es lo que domina, no los bytes del payload.
   *
   * Va como `volatile`: si un pasajero va lento en 3G, mejor saltarse el frame
   * que acumularle un backlog de posiciones viejas.
   */
  private difundirPendientes() {
    if (this.pendientesBroadcast.size === 0) return;

    for (const [numeroRuta, sesiones] of this.pendientesBroadcast) {
      // Puntos individuales solo a las rooms chicas (pocos watchers, quieren
      // granularidad). La room grande de la ruta va por lote.
      for (const sesion of sesiones) {
        const punto = {
          id_viaje: sesion.id_viaje,
          ...this.aPunto(sesion),
          origen: sesion.online ? 'gps' : 'sin_conexion',
        };
        this.server?.volatile
          .to(roomViaje(sesion.id_viaje))
          .emit('viaje:ubicacion', punto);
        this.server?.volatile
          .to(roomCooperativa(sesion.cooperativa))
          .emit('viaje:ubicacion', punto);
      }

      this.server?.volatile.to(roomRuta(numeroRuta)).emit('viaje:ubicaciones', {
        numero_ruta: numeroRuta,
        // Sin placa/username: el cliente ya los tiene del snapshot y no
        // cambian. Aqui solo va lo que se mueve.
        buses: sesiones.map((s) => ({
          id_viaje: s.id_viaje,
          ...this.aPunto(s),
        })),
        server_time: Date.now(),
      });
    }

    this.pendientesBroadcast.clear();
  }

  private sesionVolvio(sesion: ViajeSession) {
    this.encolarBroadcast(sesion);
    this.difundirPendientes();
    this.server
      ?.to(roomViaje(sesion.id_viaje))
      .emit('viaje:online', { id_viaje: sesion.id_viaje });
    this.server
      ?.to(roomRuta(sesion.numeroRuta))
      .emit('viaje:online', { id_viaje: sesion.id_viaje });
    this.logger.log(
      `Sesion ${sesion.id_viaje} de ${sesion.username} de vuelta`,
    );
  }

  // ==================================================================
  //  PERSISTENCIA THROTELEADA
  // ==================================================================

  private async tick() {
    const ahora = Date.now();

    for (const sesion of this.sesiones.values()) {
      if (ahora - sesion.lastSeen > SESION_TIMEOUT_MS && sesion.online) {
        sesion.online = false;
        this.encolarBroadcast(sesion);
        this.server?.to(roomRuta(sesion.numeroRuta)).emit('viaje:offline', {
          id_viaje: sesion.id_viaje,
          hace_ms: ahora - sesion.lastSeen,
        });
      }
    }

    await this.flushHistorial(false);
    await this.refrescarUltimasUbicaciones();
  }

  /**
   * Un SOLO INSERT multi-fila con los puntos de TODAS las sesiones. Antes eran
   * N inserts cada 10s (uno por bus); con 100 buses son 100 viajes al DB que
   * se evitan solo acumulando antes de escribir.
   */
  private async flushHistorial(force: boolean) {
    if (force && this.sesiones.size === 0) return;
    if (!force && this.ultimoFlush + FLUSH_INTERVAL_MS > Date.now()) return;

    const filas: FilaHistorial[] = [];
    /** Para poder devolver los puntos a su sesion si el INSERT falla. */
    const origenes: Array<{
      sesion: ViajeSession;
      puntos: PuntoUbicacion[];
    }> = [];

    for (const sesion of this.sesiones.values()) {
      if (sesion.buffer.length === 0) continue;
      for (const p of sesion.buffer) {
        filas.push({
          id_viaje: sesion.id_viaje,
          lactitud: p.lat,
          longitud: p.lng,
          velocidad: p.velocidad,
          rumbo: p.rumbo,
          precision: p.precision,
          recorded_at: new Date(p.ts),
        });
      }
      origenes.push({ sesion, puntos: sesion.buffer });
      sesion.buffer = [];
      sesion.lastFlushAt = Date.now();
    }

    if (filas.length === 0) return;
    this.ultimoFlush = Date.now();

    try {
      await this.ubicacionesRepository.insert(filas);
      this.logger.debug(
        `${filas.length} puntos -> ${origenes.length} viaje(s) en 1 INSERT`,
      );
    } catch (error) {
      // No se pierden: cada punto vuelve al buffer de su sesion.
      for (const o of origenes) {
        o.sesion.buffer.unshift(...o.puntos);
      }
      this.logger.error(
        `Fallo el INSERT de ${filas.length} puntos, devueltos a los buffers: ${(error as Error).message}`,
      );
    }
  }

  private ultimoFlush = 0;

  /**
   * Refresca viaje.lactitud/longitud (la ultima posicion conocida) de todas las
   * sesiones que cambiaron. Throttleado a 30s por sesion: escribir en cada ping
   * seria martillar la tabla mas consultada de la base.
   */
  private async refrescarUltimasUbicaciones() {
    if (this.pendientesViaje.size === 0) return;

    const ahora = Date.now();
    const aActualizar: ViajeSession[] = [];
    for (const idViaje of this.pendientesViaje) {
      const sesion = this.sesiones.get(idViaje);
      if (!sesion) {
        this.pendientesViaje.delete(idViaje);
        continue;
      }
      if (ahora - sesion.lastDbUpdateAt < DB_UPDATE_INTERVAL_MS) continue;
      aActualizar.push(sesion);
      this.pendientesViaje.delete(idViaje);
    }

    if (aActualizar.length === 0) return;

    // En paralelo: a 30s de throttle son ~3 UPDATEs/seg con 100 buses, no
    // compensa montar un UPDATE ... FROM (VALUES ...).
    await Promise.all(
      aActualizar.map(async (sesion) => {
        try {
          const { lat, lng } = sesion.lastLocation;
          await this.viajesRepository.update(
            { id_viaje: sesion.id_viaje },
            { lactitud: lat, longitud: lng },
          );
          sesion.lastDbUpdateAt = Date.now();
          sesion.pendingDbUpdate = false;
        } catch (error) {
          // Se reencola para el proximo tick.
          this.pendientesViaje.add(sesion.id_viaje);
          this.logger.error(
            `No se pudo refrescar la ubicacion del viaje ${sesion.id_viaje}: ${(error as Error).message}`,
          );
        }
      }),
    );
  }

  /**
   * Force encola el refresh de una sesion. Se usa al finalizar y al apagar, no
   * durante el viaje normal (ahi manda el throttle de 30s).
   */
  private async persistirUltimaUbicacion(sesion: ViajeSession, force: boolean) {
    if (!sesion.pendingDbUpdate) return;
    if (!force && Date.now() - sesion.lastDbUpdateAt < DB_UPDATE_INTERVAL_MS) {
      return;
    }
    const { lat, lng } = sesion.lastLocation;
    await this.viajesRepository.update(
      { id_viaje: sesion.id_viaje },
      { lactitud: lat, longitud: lng },
    );
    sesion.lastDbUpdateAt = Date.now();
    sesion.pendingDbUpdate = false;
    this.pendientesViaje.delete(sesion.id_viaje);
  }

  /**
   * Fuga de memoria: si el chofer cierra la app a la fuerza y nunca vuelve, su
   * sesion se queda en el Map para siempre. Un viaje de mas de MAX_SESION_HORAS
   * abierto es un bug del cliente, no un caso legitimo.
   */
  private reaper() {
    const limite = Date.now() - MAX_SESION_HORAS * 60 * 60 * 1000;
    for (const [idViaje, sesion] of [...this.sesiones]) {
      if (sesion.fechaInicio.getTime() > limite) continue;
      if (sesion.online) continue; // online: es un viaje largo de verdad
      this.logger.warn(
        `Sesion ${idViaje} de ${sesion.username} lleva mas de ${MAX_SESION_HORAS}h offline, se descarta`,
      );
      this.eliminar(idViaje);
      this.server?.to(roomRuta(sesion.numeroRuta)).emit('viaje:descartado', {
        id_viaje: idViaje,
        motivo: 'sesion_expirada',
      });
    }
  }

  // ==================================================================
  //  CONSULTAS
  // ==================================================================

  getSesionDelSocket(socketId: string): ViajeSession | undefined {
    const idViaje = this.indicePorSocket.get(socketId);
    return idViaje ? this.sesiones.get(idViaje) : undefined;
  }

  getSesion(idViaje: number): ViajeSession | undefined {
    return this.sesiones.get(idViaje);
  }

  /**
   * El telefono se caido (tunel, LTE, bateria) y volvio con un socket nuevo, pero
   * el viaje sigue abierto. Sin esto el chofer tendria que abrir un viaje nuevo y
   * el anterior quedaria con fecha_final NULL para siempre.
   */
  reconectar(
    userId: number,
    socketId: string,
    idViaje: number,
  ): { sesion: ViajeSession; recuperado: boolean } {
    const sesion = this.sesiones.get(idViaje);
    if (!sesion) {
      throw new NotFoundException(
        `El viaje ${idViaje} ya no esta en curso. Abri uno nuevo.`,
      );
    }
    if (sesion.userId !== userId) {
      throw new UnauthorizedException('Ese viaje pertenece a otro conductor.');
    }

    // El socket viejo murio hace rato: se limpia su indice para que no apunte
    // a una sesion que ahora pertenece a otro socket.
    if (sesion.socketId !== socketId) {
      if (this.indicePorSocket.get(sesion.socketId) === idViaje) {
        this.indicePorSocket.delete(sesion.socketId);
      }
      sesion.socketId = socketId;
      sesion.online = true;
      sesion.lastSeen = Date.now();
      // Un buffer grande significa que estuvo sin red: se apura la escritura.
      if (sesion.buffer.length > 0) void this.flushHistorial(true);
    }

    this.registrar(sesion);
    this.encolarBroadcast(sesion);
    return { sesion, recuperado: true };
  }

  /**
   * Heartbeat. Al telefono se le corta la senal y vuelve sin mandar posicion
   * durante un rato; el ping es lo que prueba que la conexion sigue viva.
   */
  touch(idViaje: number): void {
    const sesion = this.sesiones.get(idViaje);
    if (!sesion) return;
    sesion.lastSeen = Date.now();
    if (!sesion.online) {
      sesion.online = true;
      this.sesionVolvio(sesion);
    }
  }

  /**
   * Posiciones vivas indexadas por id_viaje. La BD se refresca cada 30s, asi
   * que para "buses cerca de mi" esto es lo unico que tiene la posicion al
   * instante; lo que hay en viaje esta hasta 30s atrasado.
   */
  posicionesVivas(): Map<number, ViajePublico> {
    const mapa = new Map<number, ViajePublico>();
    for (const sesion of this.sesiones.values()) {
      mapa.set(sesion.id_viaje, this.aPublica(sesion));
    }
    return mapa;
  }

  /** Snapshot para el pasajero que acaba de conectarse a una ruta. */
  snapshotRuta(numeroRuta: string): {
    numero_ruta: string;
    total: number;
    buses: ViajePublico[];
    server_time: string;
  } {
    const buses: ViajePublico[] = [];
    for (const sesion of this.sesiones.values()) {
      if (sesion.numeroRuta !== numeroRuta) continue;
      buses.push(this.aPublica(sesion));
    }
    return {
      numero_ruta: numeroRuta,
      total: buses.length,
      buses,
      server_time: new Date().toISOString(),
    };
  }

  snapshotTodos(): {
    total: number;
    buses: ViajePublico[];
    server_time: string;
  } {
    return {
      total: this.sesiones.size,
      buses: Array.from(this.sesiones.values()).map((s) => this.aPublica(s)),
      server_time: new Date().toISOString(),
    };
  }

  /** Metricas de salud, para exponerlas en un endpoint de admin. */
  stats() {
    let online = 0;
    let enBuffer = 0;
    for (const s of this.sesiones.values()) {
      if (s.online) online++;
      enBuffer += s.buffer.length;
    }
    return {
      sesiones_activas: this.sesiones.size,
      sesiones_online: online,
      puntos_en_buffer: enBuffer,
      rutas_con_pendientes: this.pendientesBroadcast.size,
      viajes_por_actualizar: this.pendientesViaje.size,
    };
  }

  /** Payload minimo del evento caliente. Sin placa/username: son constantes. */
  private aPunto(sesion: ViajeSession): ViajePublico['ultima_ubicacion'] {
    const p = sesion.lastLocation;
    return {
      lat: p.lat,
      lng: p.lng,
      velocidad: p.velocidad,
      rumbo: p.rumbo,
      precision: p.precision,
      ts: p.ts,
    };
  }

  /** Forma que se manda por el socket: nunca se filtran refs internas de TypeORM. */
  private aPublica(sesion: ViajeSession): ViajePublico {
    return {
      id_viaje: sesion.id_viaje,
      username: sesion.username,
      placa: sesion.placa,
      numero_ruta: sesion.numeroRuta,
      cooperativa: sesion.cooperativa,
      online: sesion.online,
      fecha_inicio: sesion.fechaInicio.toISOString(),
      ultima_ubicacion: this.aPunto(sesion),
    };
  }

  // ==================================================================
  //  INTERNO
  // ==================================================================

  private registrar(sesion: ViajeSession) {
    this.sesiones.set(sesion.id_viaje, sesion);
    this.indicePorSocket.set(sesion.socketId, sesion.id_viaje);
  }

  private eliminar(idViaje: number) {
    const sesion = this.sesiones.get(idViaje);
    if (!sesion) return;
    this.sesiones.delete(idViaje);
    this.pendientesViaje.delete(idViaje);
    if (this.indicePorSocket.get(sesion.socketId) === idViaje) {
      this.indicePorSocket.delete(sesion.socketId);
    }
  }

  private sesionesDelSocket(socketId: string): number[] {
    const ids: number[] = [];
    for (const [idViaje, sesion] of this.sesiones) {
      if (sesion.socketId === socketId) ids.push(idViaje);
    }
    return ids;
  }

  /** Cierra cualquier sesion previa del socket antes de abrir una nueva. */
  private descartarSesionesDelSocket(socketId: string) {
    const aDescartar = this.sesionesDelSocket(socketId);
    if (aDescartar.length === 0) return; // no hay nada que descartar ni que volcar

    for (const idViaje of aDescartar) {
      const sesion = this.sesiones.get(idViaje);
      if (!sesion) continue;
      this.encolarHistorial(sesion);
      this.eliminar(idViaje);
      this.server?.to(roomViaje(idViaje)).emit('viaje:descartado', {
        id_viaje: idViaje,
      });
    }
    void this.flushHistorial(true);
  }

  private distanciaMetros(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ) {
    const rad = (d: number) => (d * Math.PI) / 180;
    const dLat = rad(lat2 - lat1);
    const dLng = rad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLng / 2) ** 2;
    return 2 * R_TIERRA_M * Math.asin(Math.min(1, Math.sqrt(a)));
  }

  /**
   * Al apagar el server hay que bajar los buffers o los ultimos metros de cada
   * viaje se pierden.
   */
  async onModuleDestroy() {
    for (const t of [this.flushTimer, this.broadcastTimer, this.reaperTimer]) {
      if (t) clearInterval(t);
    }
    this.flushTimer = undefined;
    this.broadcastTimer = undefined;
    this.reaperTimer = undefined;

    if (this.sesiones.size === 0) return;
    this.logger.log(
      `Volcando ${this.sesiones.size} sesion(es) antes de apagar...`,
    );
    await this.flushHistorial(true);
    this.difundirPendientes();
    await Promise.all(
      [...this.sesiones.values()].map((s) =>
        this.persistirUltimaUbicacion(s, true).catch((error) =>
          this.logger.error(
            `No se pudo volcar el viaje ${s.id_viaje}: ${(error as Error).message}`,
          ),
        ),
      ),
    );
  }
}
