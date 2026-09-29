import {
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UsuariosEntity } from 'src/entidades/Usuarios.entity';
import {
  CerrarViajeWsDto,
  IniciarViajeWsDto,
  ReconectarViajeWsDto,
  SuscribirRutaWsDto,
  UbicacionWsDto,
} from 'src/dtos/viajes/TrackingWs.dto';
import { WebsocketService } from './websocket.service';
import {
  roomConductor,
  roomCooperativa,
  roomRuta,
  roomViaje,
  RATE_LIMIT_POR_SEGUNDO,
  RATE_LIMIT_RAFAGA,
  ViajeSession,
} from './websocket.types';

type Ack = (response: unknown) => void;

/** Cualquiera autenticado puede ver; solo el Conductor puede mover un bus. */
const ROL_QUE_PUBLICA = 'Conductor';

interface ConductorConectado {
  userId: number;
  username: string;
  rol: string;
}

/** Token bucket por socket. Vive en socket.data para morir con la conexion. */
interface Limite {
  tokens: number;
  ultimoRefill: number;
}

@WebSocketGateway({
  cors: { origin: '*', methods: ['GET', 'POST'], credentials: true },
  transports: ['websocket', 'polling'],
})
export class WebsocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;

  private readonly logger = new Logger('WebsocketGateway');

  /** socketId -> identidad verificada. Base de todo el control de acceso. */
  private readonly conductores = new Map<string, ConductorConectado>();

  /** socketId -> cubo de tokens del rate limit. */
  private readonly limites = new Map<string, Limite>();
  constructor(
    private readonly trackingService: WebsocketService,
    private readonly jwtService: JwtService,
    @InjectRepository(UsuariosEntity)
    private readonly usuariosRepository: Repository<UsuariosEntity>,
  ) {}

  afterInit(server: Server) {
    this.server = server;
    this.trackingService.setServer(server);
    this.logger.log(
      'Gateway listo: el telefono publica, el servidor solo retransmite a las rooms.',
    );
  }

  // ==================================================================
  //  CONEXION / AUTENTICACION
  // ==================================================================

  async handleConnection(client: Socket) {
    // Los handlers se registran ANTES de verificar. La verificacion contra la
    // BD es async, y el cliente puede emitir en cuanto termina el handshake: si
    // los registramos despues del await, ese evento se cae al vacio y el movil
    // se queda esperando una respuesta que nunca llega.
    const identidadP = this.autenticar(client);
    this.registrarHandlers(client, identidadP);

    const identidad = await identidadP;
    if (!identidad) return; // autenticar() ya cerro el socket

    this.conductores.set(client.id, identidad);
    await client.join(roomConductor(identidad.username));

    this.logger.log(
      `${identidad.username} (${identidad.rol}) conectado: ${client.id}`,
    );

    client.emit('conexion:lista', {
      username: identidad.username,
      user_id: identidad.userId,
      rol: identidad.rol,
      server_time: new Date().toISOString(),
      viajes_activos: this.trackingService.snapshotTodos(),
    });
  }

  handleDisconnect(client: Socket) {
    const identidad = this.conductores.get(client.id);
    this.conductores.delete(client.id);
    this.limites.delete(client.id);

    // El viaje NO se cierra: con senal LTE mala el chofer reconecta en
    // segundos y cerrarselo perderia el dato. Solo se marca offline para que el
    // mapa muestre el bus en gris.
    const afectadas = this.trackingService.marcarSesionOffline(client.id);
    if (afectadas.length > 0) {
      this.logger.log(
        `${identidad?.username ?? client.id} salio con ${afectadas.length} viaje(s) en curso`,
      );
    } else {
      this.logger.log(`Cliente ${client.id} desconectado`);
    }
  }

  private async autenticar(client: Socket): Promise<ConductorConectado | null> {
    const token =
      (client.handshake.auth?.token as string | undefined) ??
      (client.handshake.query?.token as string | undefined);

    if (!token) {
      this.rechazar(
        client,
        'token_ausente',
        'Falta el token. Mandalo en handshake.auth.token.',
      );
      return null;
    }

    let payload: Record<string, unknown>;
    try {
      payload = this.jwtService.verify(token);
    } catch (error) {
      const expirado =
        error instanceof Error && error.name === 'TokenExpiredError';
      this.rechazar(
        client,
        expirado ? 'token_expirado' : 'token_invalido',
        expirado
          ? 'El token expiro. Vuelve a hacer login y reconecta.'
          : 'El token no es valido.',
      );
      return null;
    }

    // El rol NO se valida aqui: un supervisor o un pasajero con cuenta tambien
    // tiene derecho a ver el mapa. Lo que exige rol Conductor es publicar
    // posiciones, y eso se comprueba en cada evento de escritura.

    // El JWT solo lleva el username: se confirma que la cuenta siga viva. El
    // token de un conductor dado de baja no debe poder mover un bus.
    const usuario = await this.usuariosRepository.findOne({
      where: { username: payload.username as string },
    });
    if (!usuario) {
      this.rechazar(client, 'usuario_no_existe', 'El usuario ya no existe.');
      return null;
    }
    if (!usuario.status) {
      this.rechazar(
        client,
        'usuario_inactivo',
        'Tu cuenta esta inactiva. Contacta a un administrador.',
      );
      return null;
    }

    return {
      userId: usuario.user_id,
      username: usuario.username,
      rol: usuario.rol,
    };
  }

  private rechazar(client: Socket, code: string, mensaje: string) {
    this.logger.warn(`Conexion rechazada [${code}] desde ${client.id}`);
    client.emit('error:no_autorizado', { code, message: mensaje });
    // Small delay so the error frame actually flushes before the close.
    setTimeout(() => client.disconnect(true), 50);
  }

  // ==================================================================
  //  EVENTOS
  // ==================================================================

  private registrarHandlers(
    client: Socket,
    identidadP: Promise<ConductorConectado | null>,
  ) {
    /**
     * Espera a que la verificacion termine. Cada handler arranca con esto, y
     * con esto solo, se garantiza que ningun evento se pierda por llegar antes
     * de tiempo ni que un socket rechazado ejecute logica de negocio.
     */
    const esperarIdentidad = async (
      ack?: Ack,
    ): Promise<ConductorConectado | null> => {
      const identidad = await identidadP;
      if (identidad) return identidad;
      // El socket ya va a cerrarse; el ack evita que el cliente cuelgue.
      ack?.({
        ok: false,
        code: 'no_autorizado',
        message: 'La conexion no fue autenticada.',
      });
      return null;
    };

    /** Corta a quien no puede mover un bus (supervisor, observador, etc). */
    const exigirConductor = (
      identidad: ConductorConectado,
      ack?: Ack,
    ): boolean => {
      if (identidad.rol === ROL_QUE_PUBLICA) return true;
      const mensaje = `Tu rol "${identidad.rol}" puede ver el mapa pero no publicar posiciones.`;
      client.emit('error:no_autorizado', {
        code: 'rol_sin_permiso',
        message: mensaje,
      });
      ack?.({ ok: false, code: 'rol_sin_permiso', message: mensaje });
      return false;
    };

    // ---- El conductor abre un viaje ----
    client.on('viaje:start', async (raw: unknown, ack?: Ack) => {
      const identidad = await esperarIdentidad(ack);
      if (!identidad) return;
      if (!exigirConductor(identidad, ack)) return;

      const dto = this.validar(IniciarViajeWsDto, raw, client);
      if (!dto) return ack?.({ ok: false, code: 'validacion' });

      try {
        const sesion = await this.trackingService.iniciarViaje(
          identidad.userId,
          identidad.username,
          client.id,
          dto,
        );
        await this.unirRooms(client, sesion);

        const payload = {
          id_viaje: sesion.id_viaje,
          numero_ruta: sesion.numeroRuta,
          placa: sesion.placa,
          fecha_inicio: sesion.fechaInicio.toISOString(),
        };
        client.emit('viaje:iniciado', payload);
        ack?.({ ok: true, ...payload });
        this.logger.log(
          `Viaje ${sesion.id_viaje} abierto por ${identidad.username} (${sesion.placa} / ${sesion.numeroRuta})`,
        );
      } catch (error) {
        this.responderError(client, ack, error);
      }
    });

    // ---- El GPS empuja una posicion ----
    client.on('viaje:ubicacion', async (raw: unknown, ack?: Ack) => {
      const identidad = await esperarIdentidad(ack);
      if (!identidad) return;
      if (!exigirConductor(identidad, ack)) return;

      if (!this.permitirEvento(client)) {
        // Un cliente con un bug puede mandar miles por segundo y tumbar la
        // instancia entera. Se corta sin desconectar para no perder el viaje.
        return ack?.({
          ok: false,
          code: 'rate_limit',
          message: 'Demasiados eventos. Baja la frecuencia del GPS.',
        });
      }

      const dto = this.validar(UbicacionWsDto, raw, client);
      if (!dto) return ack?.({ ok: false, code: 'validacion' });

      const sesion = this.resolverSesion(client, dto.id_viaje);
      if (!sesion) {
        return ack?.({
          ok: false,
          code: 'sin_viaje_activo',
          message: 'No tenes un viaje abierto. Manda viaje:start primero.',
        });
      }

      const resultado = this.trackingService.registrarUbicacion(sesion, dto);
      // Un punto filtrado no es un error: se confirma igual para que el
      // telefono no entre en reintentos.
      ack?.({
        ok: true,
        aceptado: resultado.aceptado,
        motivo: resultado.motivo,
        id_viaje: sesion.id_viaje,
      });
    });

    // ---- Reanudar un viaje tras perder la conexion ----
    client.on('viaje:reconectar', async (raw: unknown, ack?: Ack) => {
      const identidad = await esperarIdentidad(ack);
      if (!identidad) return;
      if (!exigirConductor(identidad, ack)) return;

      const dto = this.validar(ReconectarViajeWsDto, raw, client);
      if (!dto) return ack?.({ ok: false, code: 'validacion' });

      try {
        const { sesion } = this.trackingService.reconectar(
          identidad.userId,
          client.id,
          dto.id_viaje,
        );
        await this.unirRooms(client, sesion);

        const payload = {
          id_viaje: sesion.id_viaje,
          numero_ruta: sesion.numeroRuta,
          placa: sesion.placa,
          fecha_inicio: sesion.fechaInicio.toISOString(),
        };
        client.emit('viaje:reconectado', payload);
        ack?.({ ok: true, ...payload });
        this.logger.log(
          `${identidad.username} reconecto al viaje ${sesion.id_viaje} (${sesion.placa})`,
        );
      } catch (error) {
        this.responderError(client, ack, error);
      }
    });

    // ---- Pausa / cierre ----
    const cerrar = async (raw: unknown, ack?: Ack) => {
      const identidad = await esperarIdentidad(ack);
      if (!identidad) return;
      if (!exigirConductor(identidad, ack)) return;

      const dto = this.validar(CerrarViajeWsDto, raw ?? {}, client);
      if (!dto) return ack?.({ ok: false, code: 'validacion' });

      const sesion = this.resolverSesion(client, dto.id_viaje);
      if (!sesion) {
        return ack?.({
          ok: false,
          code: 'sin_viaje_activo',
          message: 'No tenes un viaje abierto.',
        });
      }
      if (sesion.username !== identidad.username) {
        return ack?.({
          ok: false,
          code: 'viaje_ajeno',
          message: 'Ese viaje pertenece a otro conductor.',
        });
      }

      try {
        const resultado = await this.trackingService.finalizarViaje(
          sesion,
          dto,
        );
        ack?.({ ok: true, ...resultado });
      } catch (error) {
        this.responderError(client, ack, error);
      }
    };

    client.on('viaje:pausa', cerrar);
    client.on('viaje:finalizar', cerrar);

    // ---- Suscripcion de rutas (lado observador) ----
    client.on('suscribir:ruta', async (raw: unknown, ack?: Ack) => {
      const identidad = await esperarIdentidad(ack);
      if (!identidad) return;

      const dto = this.validar(SuscribirRutaWsDto, raw, client);
      if (!dto) return ack?.({ ok: false, code: 'validacion' });

      await client.join(roomRuta(dto.numero_ruta));
      // El snapshot evita que un observador que entra a mitad de viaje espere al
      // siguiente ping para ver el bus.
      const snapshot = this.trackingService.snapshotRuta(dto.numero_ruta);
      client.emit('suscrito:ruta', snapshot);
      ack?.({ ok: true, ...snapshot });
      this.logger.log(
        `${identidad.username} se suscribio a la ruta ${dto.numero_ruta} (${snapshot.total} buses)`,
      );
    });

    client.on('desuscribir:ruta', async (raw: unknown, ack?: Ack) => {
      if (!(await esperarIdentidad(ack))) return;
      const dto = this.validar(SuscribirRutaWsDto, raw, client);
      if (!dto) return ack?.({ ok: false, code: 'validacion' });
      await client.leave(roomRuta(dto.numero_ruta));
      ack?.({ ok: true });
    });

    client.on('viajes:activos', async (_raw: unknown, ack?: Ack) => {
      if (!(await esperarIdentidad(ack))) return;
      ack?.({ ok: true, ...this.trackingService.snapshotTodos() });
    });

    // ---- Heartbeat: prueba que la conexion sigue viva y mide la latencia ----
    client.on('ping', (raw: unknown, ack?: Ack) => {
      const sesion = this.trackingService.getSesionDelSocket(client.id);
      if (sesion) this.trackingService.touch(sesion.id_viaje);
      ack?.({
        ok: true,
        server_time: Date.now(),
        cliente_ts: (raw as { ts?: number })?.ts ?? null,
      });
    });
  }

  // ==================================================================
  //  HELPERS
  // ==================================================================

  /**
   * Token bucket. Permite una rafaga corta (arranque del GPS, reconexion) pero
   * corta a quien se dedica a inundar el socket. Vive en un Map y no en
   * socket.data para no pelear con el tipo `any` de socket.io.
   */
  private permitirEvento(client: Socket): boolean {
    const ahora = Date.now();
    let limite = this.limites.get(client.id);

    if (!limite) {
      limite = { tokens: RATE_LIMIT_RAFAGA, ultimoRefill: ahora };
      this.limites.set(client.id, limite);
    }

    // Relleno continuo: recupera RATE_LIMIT_POR_SEGUNDO tokens por segundo.
    const transcurrido = ahora - limite.ultimoRefill;
    limite.tokens = Math.min(
      RATE_LIMIT_RAFAGA,
      limite.tokens + (transcurrido / 1000) * RATE_LIMIT_POR_SEGUNDO,
    );
    limite.ultimoRefill = ahora;

    if (limite.tokens < 1) return false;
    limite.tokens -= 1;
    return true;
  }

  /** El conductor entra a las rooms de su viaje, su ruta y su cooperativa. */
  private async unirRooms(client: Socket, sesion: ViajeSession) {
    await client.join(roomViaje(sesion.id_viaje));
    await client.join(roomRuta(sesion.numeroRuta));
    if (sesion.cooperativa) {
      await client.join(roomCooperativa(sesion.cooperativa));
    }
  }

  private resolverSesion(
    client: Socket,
    idViaje?: number,
  ): ViajeSession | undefined {
    if (idViaje === undefined || idViaje === null) {
      return this.trackingService.getSesionDelSocket(client.id);
    }
    const sesion = this.trackingService.getSesion(idViaje);
    // Un id_viaje explicito solo vale si pertenece a este mismo socket.
    return sesion && sesion.socketId === client.id ? sesion : undefined;
  }

  private validar<T extends object>(
    clase: new () => T,
    raw: unknown,
    client: Socket,
  ): T | null {
    // La conversion implicita va en plainToInstance: validateSync no la acepta.
    const instancia = plainToInstance(clase, raw ?? {}, {
      enableImplicitConversion: true,
    });
    const errores = validateSync(instancia as object, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    if (errores.length > 0) {
      client.emit('error:validacion', {
        message: 'Payload invalido',
        detalles: errores.map((e) => ({
          campo: e.property,
          errores: Object.values(e.constraints ?? {}),
        })),
      });
      return null;
    }
    return instancia;
  }

  private responderError(client: Socket, ack: Ack | undefined, error: unknown) {
    if (error instanceof NotFoundException) {
      client.emit('error:no_encontrado', { message: error.message });
      return ack?.({
        ok: false,
        code: 'no_encontrado',
        message: error.message,
      });
    }
    if (error instanceof UnauthorizedException) {
      client.emit('error:no_autorizado', { message: error.message });
      return ack?.({
        ok: false,
        code: 'no_autorizado',
        message: error.message,
      });
    }
    this.logger.error(
      `Error en el socket ${client.id}: ${(error as Error).message}`,
      (error as Error).stack,
    );
    client.emit('error:interno', { message: 'Error interno del servidor.' });
    return ack?.({ ok: false, code: 'error_interno' });
  }
}
