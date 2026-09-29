import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WebsocketGateway } from './websocket.gateway';
import { WebsocketService } from './websocket.service';
import { UsuariosEntity } from 'src/entidades/Usuarios.entity';
import { IniciarViajeWsDto } from 'src/dtos/viajes/TrackingWs.dto';

describe('WebsocketGateway', () => {
  let gateway: WebsocketGateway;

  const conductor = {
    user_id: 7,
    username: 'conductor1',
    status: true,
    rol: 'Conductor',
  };
  const admin = {
    user_id: 1,
    username: 'root',
    status: true,
    rol: 'Admin',
  };
  expect(admin.rol).not.toBe('Conductor');

  const usuariosRepo = {
    findOne: jest.fn(async () => conductor),
  };
  const tracking = {
    setServer: jest.fn(),
    snapshotTodos: jest.fn(() => ({ total: 0, buses: [], server_time: 'x' })),
    snapshotRuta: jest.fn(() => ({
      numero_ruta: 'R-01',
      total: 0,
      buses: [],
      server_time: 'x',
    })),
    iniciarViaje: jest.fn(),
    registrarUbicacion: jest.fn(() => ({ aceptado: true, ts: 1 })),
    finalizarViaje: jest.fn(),
    marcarSesionOffline: jest.fn(() => []),
    getSesion: jest.fn(),
    getSesionDelSocket: jest.fn(),
    reconectar: jest.fn(),
    touch: jest.fn(),
  };
  const jwt = {
    verify: jest.fn(() => ({
      user_id: 7,
      username: 'conductor1',
      rol: 'Conductor',
    })),
  };

  const crearSocket = (auth: Record<string, unknown> = {}) => ({
    id: 'socket-1',
    handshake: { auth, query: {} },
    emit: jest.fn(),
    join: jest.fn().mockResolvedValue(undefined),
    leave: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    on: jest.fn(),
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    usuariosRepo.findOne.mockResolvedValue(conductor);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebsocketGateway,
        { provide: WebsocketService, useValue: tracking },
        { provide: JwtService, useValue: jwt },
        { provide: getRepositoryToken(UsuariosEntity), useValue: usuariosRepo },
      ],
    }).compile();

    gateway = module.get<WebsocketGateway>(WebsocketGateway);
  });

  describe('autenticacion en el handshake', () => {
    it('rechaza si no viene token', async () => {
      const client = crearSocket();
      await gateway.handleConnection(client as any);

      expect(client.emit).toHaveBeenCalledWith(
        'error:no_autorizado',
        expect.objectContaining({ code: 'token_ausente' }),
      );
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    it('rechaza un token invalido', async () => {
      jwt.verify.mockImplementationOnce(() => {
        throw new Error('bad signature');
      });
      const client = crearSocket({ token: 'abc' });
      await gateway.handleConnection(client as any);

      expect(client.emit).toHaveBeenCalledWith(
        'error:no_autorizado',
        expect.objectContaining({ code: 'token_invalido' }),
      );
    });

    it('avisa cuando el token expiro (el movil debe re-logear)', async () => {
      jwt.verify.mockImplementationOnce(() => {
        const e = new Error('jwt expired');
        e.name = 'TokenExpiredError';
        throw e;
      });
      const client = crearSocket({ token: 'abc' });
      await gateway.handleConnection(client as any);

      expect(client.emit).toHaveBeenCalledWith(
        'error:no_autorizado',
        expect.objectContaining({ code: 'token_expirado' }),
      );
    });

    it('deja entrar a un Admin como observador, pero sin publicar', async () => {
      usuariosRepo.findOne.mockResolvedValueOnce({
        ...conductor,
        username: 'root',
        rol: 'Admin',
      });
      const client = crearSocket({ token: 'abc' });
      await gateway.handleConnection(client as any);

      // Entra: un supervisor tiene legitimo derecho a mirar el mapa.
      expect(client.emit).toHaveBeenCalledWith(
        'conexion:lista',
        expect.objectContaining({ rol: 'Admin' }),
      );
      expect(client.emit).not.toHaveBeenCalledWith(
        'error:no_autorizado',
        expect.objectContaining({ code: 'rol_no_autorizado' }),
      );

      // Pero no puede mover un bus.
      const ack = jest.fn();
      await client.on.mock.calls.find(
        ([evento]: [string]) => evento === 'viaje:start',
      )?.[1]?.({ id_ruta: 'r1', id_vehiculo: 'v1', lat: 10, lng: -66 }, ack);
      expect(ack).toHaveBeenCalledWith(
        expect.objectContaining({ ok: false, code: 'rol_sin_permiso' }),
      );
      expect(tracking.iniciarViaje).not.toHaveBeenCalled();
    });

    it('un socket rechazado no ejecuta logica aunque mande eventos', async () => {
      const client = crearSocket(); // sin token
      await gateway.handleConnection(client as any);

      // Los handlers YA estan registrados: por eso deben esperar la
      // verificacion en vez de confiar en que todavia no llego nada.
      const ack = jest.fn();
      await client.on.mock.calls.find(
        ([evento]: [string]) => evento === 'viaje:start',
      )?.[1]?.({ id_ruta: 'r1', id_vehiculo: 'v1', lat: 10, lng: -66 }, ack);

      expect(ack).toHaveBeenCalledWith(
        expect.objectContaining({ ok: false, code: 'no_autorizado' }),
      );
      expect(tracking.iniciarViaje).not.toHaveBeenCalled();
    });

    it('rechaza a un conductor dado de baja', async () => {
      usuariosRepo.findOne.mockResolvedValueOnce({
        ...conductor,
        status: false,
      });
      const client = crearSocket({ token: 'abc' });
      await gateway.handleConnection(client as any);

      expect(client.emit).toHaveBeenCalledWith(
        'error:no_autorizado',
        expect.objectContaining({ code: 'usuario_inactivo' }),
      );
    });

    it('acepta a un conductor valido y lo mete a su room privada', async () => {
      const client = crearSocket({ token: 'abc' });
      await gateway.handleConnection(client as any);

      expect(jwt.verify).toHaveBeenCalledWith('abc');
      expect(client.join).toHaveBeenCalledWith('conductor:conductor1');
      expect(client.emit).toHaveBeenCalledWith(
        'conexion:lista',
        expect.objectContaining({ username: 'conductor1', user_id: 7 }),
      );
      // Los handlers se registran solo si la identidad es buena.
      expect(client.on).toHaveBeenCalledWith(
        'viaje:start',
        expect.any(Function),
      );
    });
  });

  describe('validacion de payload', () => {
    it('rechaza coordenadas fuera de rango', async () => {
      const client = crearSocket({ token: 'abc' });
      await gateway.handleConnection(client as any);

      const ack = jest.fn();
      const handler = client.on.mock.calls.find(
        (c) => c[0] === 'viaje:start',
      )?.[1];

      await handler(
        { id_ruta: 'R-01', id_vehiculo: 'ABC123', lat: 999, lng: 0 },
        ack,
      );

      expect(client.emit).toHaveBeenCalledWith(
        'error:validacion',
        expect.anything(),
      );
      expect(ack).toHaveBeenCalledWith({ ok: false, code: 'validacion' });
      // Y lo importante: no se toco la base de datos.
      expect(tracking.iniciarViaje).not.toHaveBeenCalled();
    });

    it('rechaza campos no permitidos en vez de ignorarlos', async () => {
      const client = crearSocket({ token: 'abc' });
      await gateway.handleConnection(client as any);

      const handler = client.on.mock.calls.find(
        (c) => c[0] === 'viaje:start',
      )?.[1];
      const ack = jest.fn();

      await handler(
        {
          id_ruta: 'R-01',
          id_vehiculo: 'ABC123',
          lat: 10.48,
          lng: -66.9,
          hack: 'SQL injection',
        },
        ack,
      );

      expect(ack).toHaveBeenCalledWith({ ok: false, code: 'validacion' });
      expect(tracking.iniciarViaje).not.toHaveBeenCalled();
    });
  });

  describe('rooms', () => {
    it('al abrir un viaje une al conductor a viaje, ruta y cooperativa', async () => {
      tracking.iniciarViaje.mockResolvedValueOnce({
        id_viaje: 42,
        socketId: 'socket-1',
        username: 'conductor1',
        placa: 'ABC123',
        numeroRuta: 'R-01',
        cooperativa: 'J-123',
        fechaInicio: new Date(),
      });

      const client = crearSocket({ token: 'abc' });
      await gateway.handleConnection(client as any);
      const handler = client.on.mock.calls.find(
        (c) => c[0] === 'viaje:start',
      )?.[1];
      const ack = jest.fn();

      await handler(
        {
          ...Object.assign(new IniciarViajeWsDto(), {
            id_ruta: 'R-01',
            id_vehiculo: 'ABC123',
            lat: 10.48,
            lng: -66.9,
          }),
        },
        ack,
      );

      expect(client.join).toHaveBeenCalledWith('viaje:42');
      expect(client.join).toHaveBeenCalledWith('ruta:R-01');
      expect(client.join).toHaveBeenCalledWith('cooperativa:J-123');
      expect(ack).toHaveBeenCalledWith(expect.objectContaining({ ok: true }));
    });
  });

  describe('desconexion', () => {
    it('marca offline y NO cierra el viaje', () => {
      const client = crearSocket();
      gateway.handleDisconnect(client as any);

      expect(tracking.marcarSesionOffline).toHaveBeenCalledWith('socket-1');
      expect(tracking.finalizarViaje).not.toHaveBeenCalled();
    });
  });

  describe('reenganche tras caida de red', () => {
    it('reengancha el viaje al socket nuevo y vuelve a unir las rooms', async () => {
      const sesion = {
        id_viaje: 42,
        numeroRuta: 'R-01',
        placa: 'ABC123',
        cooperativa: 'J-123',
        fechaInicio: new Date('2026-09-29T00:00:00Z'),
      };
      // OJO: reconectar() es sincrono, asi que mockReturnValue y no
      // mockResolvedValue; con una Promise el destructuring daria undefined.
      tracking.reconectar.mockReturnValueOnce({ sesion, recuperado: true });

      const client = crearSocket({ token: 'abc' });
      await gateway.handleConnection(client as any);
      const ack = jest.fn();
      const handler = client.on.mock.calls.find(
        ([e]: [string]) => e === 'viaje:reconectar',
      )?.[1];
      await handler({ id_viaje: 42 }, ack);

      expect(tracking.reconectar).toHaveBeenCalledWith(7, 'socket-1', 42);
      expect(client.join).toHaveBeenCalledWith('ruta:R-01');
      expect(client.join).toHaveBeenCalledWith('cooperativa:J-123');
      expect(client.emit).toHaveBeenCalledWith(
        'viaje:reconectado',
        expect.objectContaining({ id_viaje: 42 }),
      );
      expect(ack).toHaveBeenCalledWith(
        expect.objectContaining({ ok: true, id_viaje: 42 }),
      );
    });

    it('propaga el error si el viaje ya no existe', async () => {
      tracking.reconectar.mockImplementationOnce(() => {
        throw new NotFoundException('El viaje 99 ya no esta en curso.');
      });

      const client = crearSocket({ token: 'abc' });
      await gateway.handleConnection(client as any);
      const ack = jest.fn();
      const handler = client.on.mock.calls.find(
        ([e]: [string]) => e === 'viaje:reconectar',
      )?.[1];
      await handler({ id_viaje: 99 }, ack);

      expect(ack).toHaveBeenCalledWith(
        expect.objectContaining({ ok: false, code: 'no_encontrado' }),
      );
    });
  });

  describe('rate limit', () => {
    it('corta al cliente que inunda el socket sin tumbar el viaje', async () => {
      tracking.getSesionDelSocket.mockReturnValue({
        id_viaje: 42,
        username: 'conductor1',
      });
      tracking.registrarUbicacion.mockReturnValue({
        aceptado: true,
        ts: Date.now(),
      });
      const client = crearSocket({ token: 'abc' });
      await gateway.handleConnection(client as any);
      const handler = client.on.mock.calls.find(
        ([e]: [string]) => e === 'viaje:ubicacion',
      )?.[1];

      const punto = { lat: 10.5, lng: -66.8 };
      // 60 es la rafaga: la 61 tiene que rebotar.
      const acks: Array<{ ok: boolean; code?: string }> = [];
      for (let i = 0; i < 61; i++) {
        const ack = jest.fn();
        await handler(punto, ack);
        acks.push(ack.mock.calls[0]?.[0]);
      }

      expect(acks[0].ok).toBe(true);
      expect(acks[60]).toEqual(
        expect.objectContaining({ ok: false, code: 'rate_limit' }),
      );
      // Importante: el socket sigue vivo, no se bota al conductor.
      expect(client.disconnect).not.toHaveBeenCalled();
    });
  });
});
