import {
  ConflictException,
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
  MAX_SESION_HORAS,
  MIN_DISTANCIA_M,
  MIN_INTERVAL_PUNTO_MS,
  PuntoUbicacion,
  roomConductor,
  roomCooperativa,
  roomRuta,
  roomViaje,
  SESION_TIMEOUT_MS,
  TICK_INTERVAL_MS,
  ViajeFinalizado,
  ViajePublico,
  ViajeSession,
} from './websocket.types';

/** Radio medio terrestre en metros, para la formula de haversine. */
const R_TIERRA_M = 6_371_000;

/**
 * Servicio de tracking en memoria: el corazon del realtime.
 *
 * Mantiene un Map de sesiones por viaje (clave `id_viaje`), agrupa las
 * posiciones por ruta para emitirlas en lotes y persiste la ultima posicion en
 * viaje_ubicacion con throttle de 30s.
 *
 * Invariante de dominio que este servicio impone: una placa no puede tener mas
 * de un viaje en curso (se comprueba en iniciarViaje).
 *
 * Implementa OnModuleDestroy para bajar los buffers (posiciones pendientes) al
 * apagarse el servidor.
 */
@Injectable()
export class WebsocketService implements OnModuleDestroy {
  /** Logger propio para separar el ruido del tracking del del gateway. */
  private readonly logger = new Logger('TrackingService');

  /**
   * Se inyecta desde el gateway en afterInit. El servicio lo usa para emitir
   * a las rooms, pero jamas toca un Socket concreto: asi la logica de tracking
   * no depende de socket.io.
   */
  private server?: Server;

  /** Sesiones en memoria indexadas por id_viaje (la "verdad caliente"). */
  private sesiones = new Map<number, ViajeSession>();
  /** Un socket puede tener varias sesiones en vuelo (reconnects rapidos). */
  private indicePorSocket = new Map<string, Set<number>>();

  /**
   * Puntos que aun no se emitieron, agrupados por ruta. Es lo que permite el
   * batching: en vez de 1 mensaje por bus, 1 mensaje por ruta.
   */
  private pendientesBroadcast = new Map<string, ViajeSession[]>();
  /** Sesiones que cambiaron y hay que refrescar en la tabla viaje. */
  private pendientesViaje = new Set<number>();

  /** Timer del tick (timeouts + refresco de posiciones en BD). */
  private tickTimer?: NodeJS.Timeout;
  /** Timer del broadcast agrupado por ruta. */
  private broadcastTimer?: NodeJS.Timeout;
  /** Timer del reaper (limpieza de sesiones muertas). */
  private reaperTimer?: NodeJS.Timeout;

  constructor(
    /** Repositorio de viajes: solo se lee al iniciar y se actualiza al cerrar. */
    @InjectRepository(ViajesEntity)
    private viajesRepository: Repository<ViajesEntity>,
    /** Repositorio de posiciones: firma el UPSERT de la ultima ubicacion. */
    @InjectRepository(ViajeUbicacionEntity)
    private ubicacionesRepository: Repository<ViajeUbicacionEntity>,
    /** Repositorio de rutas: da la cooperativa del numero de ruta. */
    @InjectRepository(RutaEntity)
    private rutaRepository: Repository<RutaEntity>,
    /** Repositorio de vehiculos: datos de la placa al iniciar el viaje. */
    @InjectRepository(VehiculosEntity)
    private vehiculosRepository: Repository<VehiculosEntity>,
  ) {}

  /** Conecta el server de socket.io y enciende los timers globales. */
  setServer(server: Server) {
    this.server = server;
    this.iniciarTimers();
  }

  // ==================================================================
  //  TIMERS
  // ==================================================================

  /**
   * Arranca los 3 timers del servicio. Solo se crean una vez (guard con
   * `if (!timer)`).
   */
  private iniciarTimers() {
    // Un unico timer global de cada tipo en vez de uno por sesion: es la forma
    // de evitar los intervalos huerfanos que dejaba el codigo anterior.
    if (!this.tickTimer) {
      this.tickTimer = setInterval(() => void this.tick(), TICK_INTERVAL_MS);
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
      `Timers: broadcast ${BROADCAST_INTERVAL_MS}ms | tick ${TICK_INTERVAL_MS}ms | ` +
        `refresco viaje ${DB_UPDATE_INTERVAL_MS}ms`,
    );
  }

  // ==================================================================
  //  CICLO DE VIDA DEL VIAJE
  // ==================================================================

  /**
   * Enciende una sesion para un viaje ya creado por el REST. Valida que el
   * viaje exista, este abierto y pertenezca al usuario y a la placa indicados.
   */
  async iniciarViaje(
    userId: number,
    username: string,
    socketId: string,
    dto: IniciarViajeWsDto,
  ): Promise<ViajeSession> {
    // El viaje ya lo creo el REST (POST /viajes/Crear-Viaje) con su usuario,
    // vehiculo y ruta. El socket NO inserta: reutiliza el id_viaje estable.
    // Eso termina con la ambiguedad de "buscar el viaje de mi usuario" cuando
    // hay mas de un viaje abierto para el mismo conductor.
    const viaje = await this.viajesRepository.findOne({
      where: { id_viaje: dto.id_viaje },
      relations: ['usuario', 'vehiculo', 'ruta', 'ruta.cooperativa'],
    });

    if (!viaje) {
      throw new NotFoundException(`El viaje ${dto.id_viaje} no existe`);
    }
    if (viaje.fecha_final) {
      throw new UnauthorizedException(
        `El viaje ${dto.id_viaje} ya fue finalizado. Abri uno nuevo.`,
      );
    }
    if (viaje.usuario?.user_id !== userId) {
      throw new UnauthorizedException('Ese viaje pertenece a otro conductor.');
    }
    if (viaje.vehiculo?.placa && viaje.vehiculo.placa !== dto.id_vehiculo) {
      throw new NotFoundException(
        `La placa ${dto.id_vehiculo} no corresponde al viaje ${dto.id_viaje}`,
      );
    }

    // Idempotencia: si el mismo viaje ya esta corriendo en memoria, no se crea
    // una sesion duplicada; se reasigna al socket que lo retomo (reconnect).
    const existente = this.sesiones.get(viaje.id_viaje);
    if (existente) {
      if (existente.socketId !== socketId) {
        this.desindexarSocket(existente.socketId, viaje.id_viaje);
        existente.socketId = socketId;
        existente.online = true;
        existente.lastSeen = Date.now();
        this.registrar(existente);
        this.encolarBroadcast(existente);
      }
      return existente;
    }

    // Un recorrido a la vez por vehiculo: la placa no puede tener otro viaje
    // en curso. Hay que finalizar el anterior primero. (Un mismo conductor si
    // puede mover placas distintas; el vehiculo es la invariante real.)
    for (const s of this.sesiones.values()) {
      if (s.placa === dto.id_vehiculo) {
        throw new ConflictException(
          `La placa ${dto.id_vehiculo} ya tiene el viaje ${s.id_viaje} en curso. Finalizalo primero.`,
        );
      }
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

    const sesion: ViajeSession = {
      id_viaje: viaje.id_viaje,
      socketId,
      userId,
      username,
      placa: viaje.vehiculo?.placa ?? dto.id_vehiculo,
      numeroRuta: viaje.ruta?.numero_ruta ?? dto.id_ruta,
      cooperativa: viaje.ruta?.cooperativa?.rif_cooperativa ?? '',
      fechaInicio: viaje.fecha_inicio ?? ahora,
      lastLocation: punto,
      lastDbUpdateAt: Date.now(),
      pendingDbUpdate: false,
      lastSeen: Date.now(),
      online: true,
    };

    this.registrar(sesion);

    // Se siembra la fila de posicion del viaje (una por viaje) desde el inicio.
    await this.persistirUbicacion(sesion);

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

  /**
   * Cierra un viaje: persiste la ultima posicion, pone fecha_final en BD,
   * elimina la sesion y avisa a las rooms del viaje, la ruta y el conductor.
   */
  async finalizarViaje(
    sesion: ViajeSession,
    dto: CerrarViajeWsDto,
  ): Promise<ViajeFinalizado> {
    // Se persiste la ultima posicion conocida antes de cerrar.
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
        this.encolarBroadcast(sesion);
      }
    }
    this.indicePorSocket.delete(socketId);
    this.difundirPendientes();
    return afectadas;
  }

  // ==================================================================
  //  UBICACIONES
  // ==================================================================

  /**
   * Recibe el punto del telefono, lo filtra (GPS ruidoso) y lo deja listo para
   * el proximo broadcast y el proximo UPSERT.
   *
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
    this.encolarBroadcast(sesion);

    return { aceptado: true, ts: punto.ts };
  }

  /** Marca una sesion para que aparezca en el proximo lote de su ruta. */
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

  /** Avisa a las rooms de que la sesion volvio a estar conectada. */
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

  /**
   * Corazon del tick: marca offline a las sesiones sin ping reciente y luego
   * baja las posiciones pendientes a la BD.
   */
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

    await this.refrescarUltimasUbicaciones();
  }

  /**
   * Refresca la fila de viaje_ubicacion (la ultima posicion conocida) de todas
   * las sesiones que cambiaron. Throttleado a 30s por sesion: escribir en cada
   * ping seria martillar la tabla mas consultada de la base.
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

    // En paralelo: a 30s de throttle son ~3 UPSERTs/seg con 100 buses, no
    // compensa montar un UPSERT ... FROM (VALUES ...).
    await Promise.all(
      aActualizar.map(async (sesion) => {
        try {
          await this.persistirUbicacion(sesion);
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
   * Guarda la posicion actual en viaje_ubicacion: UNA fila por viaje que se
   * actualiza (UPSERT) con el ultimo punto conocido.
   */
  private async persistirUbicacion(sesion: ViajeSession): Promise<void> {
    const { lat, lng, velocidad, rumbo, precision, ts } = sesion.lastLocation;
    await this.ubicacionesRepository.upsert(
      {
        id_viaje: sesion.id_viaje,
        lactitud: lat,
        longitud: lng,
        velocidad,
        rumbo,
        precision,
        recorded_at: new Date(ts),
      },
      ['id_viaje'],
    );
    sesion.lastDbUpdateAt = Date.now();
    sesion.pendingDbUpdate = false;
    this.pendientesViaje.delete(sesion.id_viaje);
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
    await this.persistirUbicacion(sesion);
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

  /** Sesion activa del socket (la primera si tiene varias). */
  getSesionDelSocket(socketId: string): ViajeSession | undefined {
    const ids = this.indicePorSocket.get(socketId);
    if (!ids || ids.size === 0) return undefined;
    return this.sesiones.get(ids.values().next().value as number);
  }

  /** Todas las sesiones del socket (en general una, pero puede haber mas). */
  getSesionesDelSocket(socketId: string): ViajeSession[] {
    const ids = this.indicePorSocket.get(socketId);
    if (!ids) return [];
    const sesiones: ViajeSession[] = [];
    for (const idViaje of ids) {
      const sesion = this.sesiones.get(idViaje);
      if (sesion) sesiones.push(sesion);
    }
    return sesiones;
  }

  /** Sesion de un viaje por su id_viaje. */
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
      this.desindexarSocket(sesion.socketId, idViaje);
      sesion.socketId = socketId;
      sesion.online = true;
      sesion.lastSeen = Date.now();
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

  /** Snapshot global: todos los buses de este proceso, para /Tracking/... y la
   * lista de conexion. */
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
    for (const s of this.sesiones.values()) {
      if (s.online) online++;
    }
    return {
      sesiones_activas: this.sesiones.size,
      sesiones_online: online,
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

  /** Da de alta una sesion en los dos indices (por id y por socket). */
  private registrar(sesion: ViajeSession) {
    this.sesiones.set(sesion.id_viaje, sesion);
    let ids = this.indicePorSocket.get(sesion.socketId);
    if (!ids) {
      ids = new Set<number>();
      this.indicePorSocket.set(sesion.socketId, ids);
    }
    ids.add(sesion.id_viaje);
  }

  /** Da de baja una sesion de todos los indices y de los pendientes. */
  private eliminar(idViaje: number) {
    const sesion = this.sesiones.get(idViaje);
    if (!sesion) return;
    this.sesiones.delete(idViaje);
    this.pendientesViaje.delete(idViaje);
    this.desindexarSocket(sesion.socketId, idViaje);
  }

  /** Quita el id del indice del socket y borra el Set si quedo vacio. */
  private desindexarSocket(socketId: string, idViaje: number) {
    const ids = this.indicePorSocket.get(socketId);
    if (!ids) return;
    ids.delete(idViaje);
    if (ids.size === 0) this.indicePorSocket.delete(socketId);
  }

  /** Ids de los viajes que tiene en vuelo un socket (por fuerza bruta). */
  private sesionesDelSocket(socketId: string): number[] {
    const ids: number[] = [];
    for (const [idViaje, sesion] of this.sesiones) {
      if (sesion.socketId === socketId) ids.push(idViaje);
    }
    return ids;
  }

  /** Distancia en metros entre dos coordenadas (haversine). */
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
    for (const t of [this.tickTimer, this.broadcastTimer, this.reaperTimer]) {
      if (t) clearInterval(t);
    }
    this.tickTimer = undefined;
    this.broadcastTimer = undefined;
    this.reaperTimer = undefined;

    if (this.sesiones.size === 0) return;
    this.logger.log(
      `Volcando ${this.sesiones.size} sesion(es) antes de apagar...`,
    );
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
