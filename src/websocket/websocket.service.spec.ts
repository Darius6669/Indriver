import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WebsocketService } from './websocket.service';
import { ViajesEntity } from 'src/entidades/Viajes.entity';
import { ViajeUbicacionEntity } from 'src/entidades/ViajeUbicacion.entity';
import { RutaEntity } from 'src/entidades/ruta.entity';
import { VehiculosEntity } from 'src/entidades/vehiculos.entity';
import { IniciarViajeWsDto } from 'src/dtos/viajes/TrackingWs.dto';

describe('WebsocketService', () => {
  let service: WebsocketService;

  let siguienteIdViaje: number;
  const viajesRepo = {
    create: jest.fn((dto) => ({ ...dto })),
    save: jest.fn(async (v) => ({ id_viaje: siguienteIdViaje++, ...v })),
    update: jest.fn().mockResolvedValue({}),
  };
  const ubicacionesRepo = {
    insert: jest.fn().mockResolvedValue({}),
  };
  const rutaRepo = {
    findOne: jest.fn(),
  };
  const vehiculoRepo = {
    findOne: jest.fn(),
  };

  /** Emulador de socket.io: solo se verifica a quien se le emite. */
  const emitido: Array<{ room: string; evento: string; payload: any }> = [];
  const fakeServer = {
    to: (room: string) => ({
      emit: (evento: string, payload: any) =>
        emitido.push({ room, evento, payload }),
      volatile: {
        to: (r: string) => ({
          emit: (evento: string, payload: any) =>
            emitido.push({ room: r, evento, payload }),
        }),
      },
    }),
    volatile: {
      to: (room: string) => ({
        emit: (evento: string, payload: any) =>
          emitido.push({ room, evento, payload }),
      }),
    },
  };

  const dto = Object.assign(new IniciarViajeWsDto(), {
    id_ruta: 'R-01',
    id_vehiculo: 'ABC123',
    lat: 10.4806,
    lng: -66.9036,
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    emitido.length = 0;
    siguienteIdViaje = 42;
    rutaRepo.findOne.mockResolvedValue({
      numero_ruta: 'R-01',
      cooperativa: { rif_cooperativa: 'J-123' },
    });
    vehiculoRepo.findOne.mockResolvedValue({ placa: 'ABC123' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebsocketService,
        { provide: getRepositoryToken(ViajesEntity), useValue: viajesRepo },
        {
          provide: getRepositoryToken(ViajeUbicacionEntity),
          useValue: ubicacionesRepo,
        },
        { provide: getRepositoryToken(RutaEntity), useValue: rutaRepo },
        {
          provide: getRepositoryToken(VehiculosEntity),
          useValue: vehiculoRepo,
        },
      ],
    }).compile();

    service = module.get<WebsocketService>(WebsocketService);
    service.setServer(fakeServer as any);
  });

  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('iniciarViaje', () => {
    it('crea el viaje con fecha_final null (en curso)', async () => {
      await service.iniciarViaje(1, 'conductor1', 'socket-1', dto);

      expect(viajesRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          fecha_final: null,
          lactitud: 10.4806,
          usuario: { user_id: 1 },
          vehiculo: { placa: 'ABC123' },
          ruta: { numero_ruta: 'R-01' },
        }),
      );
    });

    it('registra la sesion y la deja disponible por socket', async () => {
      const sesion = await service.iniciarViaje(
        1,
        'conductor1',
        'socket-1',
        dto,
      );

      expect(sesion.id_viaje).toBe(42);
      expect(service.getSesion(42)).toBeDefined();
      expect(service.getSesionDelSocket('socket-1')?.id_viaje).toBe(42);
    });

    it('avisa a los que ya estaban suscritos a la ruta', async () => {
      await service.iniciarViaje(1, 'conductor1', 'socket-1', dto);

      expect(emitido).toContainEqual(
        expect.objectContaining({
          room: 'ruta:R-01',
          evento: 'viaje:disponible',
        }),
      );
    });

    it('rechaza una ruta inexistente', async () => {
      rutaRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.iniciarViaje(1, 'conductor1', 'socket-1', dto),
      ).rejects.toThrow(/R-01 no existe/);
    });
  });

  describe('registrarUbicacion', () => {
    it('acepta un punto y lo difunde a la room de la ruta', async () => {
      const sesion = await service.iniciarViaje(
        1,
        'conductor1',
        'socket-1',
        dto,
      );
      emitido.length = 0;

      const r = service.registrarUbicacion(sesion, {
        lat: 10.4903,
        lng: -66.8888,
        ts: sesion.lastLocation.ts + 5000,
      });
      // No emite al instante: se agrupa y sale en el proximo ciclo.
      (service as any).difundirPendientes();

      expect(r.aceptado).toBe(true);
      expect(emitido).toContainEqual(
        expect.objectContaining({
          room: 'ruta:R-01',
          evento: 'viaje:ubicaciones',
          payload: expect.objectContaining({
            buses: [expect.objectContaining({ lat: 10.4903, lng: -66.8888 })],
          }),
        }),
      );
    });

    it('descarta un punto que no se movio (filtro de GPS)', async () => {
      const sesion = await service.iniciarViaje(
        1,
        'conductor1',
        'socket-1',
        dto,
      );

      const r = service.registrarUbicacion(sesion, {
        // 2 metros: por debajo de MIN_DISTANCIA_M.
        lat: 10.48061,
        lng: -66.90361,
        ts: sesion.lastLocation.ts + 5000,
      });

      expect(r.aceptado).toBe(false);
      expect(r.motivo).toBe('sin_movimiento');
    });

    it('descarta un punto disparado demasiado rapido', async () => {
      const sesion = await service.iniciarViaje(
        1,
        'conductor1',
        'socket-1',
        dto,
      );

      const r = service.registrarUbicacion(sesion, {
        lat: 10.5,
        lng: -66.8,
        ts: sesion.lastLocation.ts + 100, // < MIN_INTERVAL_PUNTO_MS
      });

      expect(r.aceptado).toBe(false);
      expect(r.motivo).toBe('intervalo_muy_corto');
    });

    it('acepta lat 0 / lng 0 sin tratarlo como valor faltante', async () => {
      const sesion = await service.iniciarViaje(
        1,
        'conductor1',
        'socket-1',
        dto,
      );
      // Greenwich / Ecuador es una coordenada legitima: el codigo viejo la
      // rechazaba por ser falsy.
      const r = service.registrarUbicacion(sesion, {
        lat: 0,
        lng: 0,
        ts: sesion.lastLocation.ts + 5000,
      });

      expect(r.aceptado).toBe(true);
      expect(sesion.lastLocation.lat).toBe(0);
    });
  });

  describe('snapshotRuta', () => {
    it('solo devuelve los buses de esa ruta', async () => {
      await service.iniciarViaje(1, 'conductor1', 'socket-1', dto);
      await service.iniciarViaje(1, 'conductor2', 'socket-2', dto);

      const todas = service.snapshotTodos();
      const deR01 = service.snapshotRuta('R-01');
      const deR99 = service.snapshotRuta('R-99');

      expect(todas.total).toBe(2);
      expect(deR01.total).toBe(2);
      expect(deR99.total).toBe(0);
    });
  });

  describe('persistencia throttleada', () => {
    it('agrupa los puntos de TODAS las sesiones en un solo INSERT', async () => {
      const a = await service.iniciarViaje(1, 'conductor1', 'socket-1', dto);
      const b = await service.iniciarViaje(2, 'conductor2', 'socket-2', dto);

      for (let i = 1; i <= 4; i++) {
        service.registrarUbicacion(a, {
          lat: 10.4806 + i * 0.001,
          lng: -66.9036,
          ts: a.lastLocation.ts + i * 5000,
        });
        service.registrarUbicacion(b, {
          lat: 10.5006 + i * 0.001,
          lng: -66.8036,
          ts: b.lastLocation.ts + i * 5000,
        });
      }

      // Nadie ha escrito todavia: todo esta en los buffers.
      expect(ubicacionesRepo.insert).not.toHaveBeenCalled();
      expect(service.stats().puntos_en_buffer).toBe(10); // 5 + 5

      await service.onModuleDestroy();

      // 1 solo INSERT para los 2 viajes, no uno por viaje.
      expect(ubicacionesRepo.insert).toHaveBeenCalledTimes(1);
      const lote = ubicacionesRepo.insert.mock.calls[0][0] as unknown[];
      expect(lote).toHaveLength(10);
      const viajes = new Set(
        (lote as Array<{ id_viaje: number }>).map((f) => f.id_viaje),
      );
      expect(viajes.size).toBe(2);
    });

    it('devuelve los puntos a los buffers si el INSERT falla', async () => {
      const a = await service.iniciarViaje(1, 'conductor1', 'socket-1', dto);
      service.registrarUbicacion(a, {
        lat: 10.5,
        lng: -66.8,
        ts: a.lastLocation.ts + 5000,
      });

      ubicacionesRepo.insert.mockRejectedValueOnce(new Error('deadlock'));

      // force=false deja pasar el throttle porque onModuleDestroy corre al final
      await service.onModuleDestroy();

      // El punto no se perdio: quedo en el buffer para el proximo intento.
      expect(a.buffer.length).toBe(2); // el inicial + el que fallo
    });
  });

  describe('refresco de la ultima posicion (el bug que se corrigio)', () => {
    it('SI actualiza viaje.lactitud/longitud durante el viaje, con throttle', async () => {
      const a = await service.iniciarViaje(1, 'conductor1', 'socket-1', dto);

      service.registrarUbicacion(a, {
        lat: 10.55,
        lng: -66.75,
        ts: a.lastLocation.ts + 5000,
      });

      // El bug era que tick() nunca llamaba a refrescarUltimasUbicaciones(),
      // asi que el endpoint de ultima ubicacion devolvia la posicion INICIAL.
      // Aqui se comprueba que el UPDATE ocurre, no que no ocurra.
      expect(a.pendingDbUpdate).toBe(true);
      // El throttle arranca al abrir el viaje: hay que simular 30s de marcha.
      a.lastDbUpdateAt = Date.now() - 30_001;
      await (service as any).tick();

      expect(viajesRepo.update).toHaveBeenCalledWith(
        { id_viaje: a.id_viaje },
        { lactitud: 10.55, longitud: -66.75 },
      );
      expect(a.pendingDbUpdate).toBe(false);
      // Y la posicion quedo persistida de verdad, no solo en memoria.
      expect(viajesRepo.update).not.toHaveBeenCalledWith(
        { id_viaje: a.id_viaje },
        { lactitud: 10.4806, longitud: -66.9036 },
      );
    });

    it('respeta el throttle de 30s: no actualiza en cada ping', async () => {
      const a = await service.iniciarViaje(1, 'conductor1', 'socket-1', dto);
      a.lastDbUpdateAt = Date.now() - 30_001;

      // Primer punto: se actualiza y arranca el reloj del throttle.
      service.registrarUbicacion(a, {
        lat: 10.55,
        lng: -66.75,
        ts: a.lastLocation.ts + 5000,
      });
      await (service as any).tick();
      const llamadas = viajesRepo.update.mock.calls.length;
      expect(llamadas).toBeGreaterThan(0);

      // Segundo punto 5s despues: el throttle lo salta.
      service.registrarUbicacion(a, {
        lat: 10.6,
        lng: -66.7,
        ts: a.lastLocation.ts + 10000,
      });
      await (service as any).tick();
      expect(viajesRepo.update.mock.calls.length).toBe(llamadas);

      // Pero queda pendiente, no se pierde.
      expect(a.pendingDbUpdate).toBe(true);
    });
  });

  describe('batching del broadcast', () => {
    it('emite UN mensaje por ruta, no uno por bus', async () => {
      const a = await service.iniciarViaje(1, 'conductor1', 'socket-1', dto);
      const b = await service.iniciarViaje(2, 'conductor2', 'socket-2', dto);
      service.registrarUbicacion(a, {
        lat: 10.55,
        lng: -66.75,
        ts: a.lastLocation.ts + 5000,
      });
      service.registrarUbicacion(b, {
        lat: 10.65,
        lng: -66.65,
        ts: b.lastLocation.ts + 5000,
      });
      emitido.length = 0;

      // Cada bus NO emite por su cuenta: solo se encola.
      expect(emitido).toHaveLength(0);

      (service as any).difundirPendientes();

      const aRuta = emitido.filter(
        (e) => e.room === 'ruta:R-01' && e.evento === 'viaje:ubicaciones',
      );
      // Un solo mensaje para los dos buses de la ruta.
      expect(aRuta).toHaveLength(1);
      expect(aRuta[0].payload.buses).toHaveLength(2);

      // Y las rooms chicas si reciben el punto individual.
      expect(
        emitido.filter((e) => e.evento === 'viaje:ubicacion'),
      ).not.toHaveLength(0);
    });

    it('el evento caliente NO lleva placa ni username (payload chico)', async () => {
      const a = await service.iniciarViaje(1, 'conductor1', 'socket-1', dto);
      service.registrarUbicacion(a, {
        lat: 10.55,
        lng: -66.75,
        ts: a.lastLocation.ts + 5000,
      });
      emitido.length = 0;
      (service as any).difundirPendientes();

      const bus = emitido.find((e) => e.evento === 'viaje:ubicaciones')?.payload
        .buses[0];

      expect(bus).toEqual({
        id_viaje: a.id_viaje,
        lat: 10.55,
        lng: -66.75,
        velocidad: null,
        rumbo: null,
        precision: null,
        ts: expect.any(Number),
      });
      // Lo estatico vive en el snapshot, no se reenvia 30 veces por minuto.
      expect(bus.placa).toBeUndefined();
      expect(bus.username).toBeUndefined();
    });

    it('no duplica la misma sesion en un ciclo', async () => {
      const a = await service.iniciarViaje(1, 'conductor1', 'socket-1', dto);
      for (let i = 1; i <= 5; i++) {
        service.registrarUbicacion(a, {
          lat: 10.4806 + i * 0.001,
          lng: -66.9036,
          ts: a.lastLocation.ts + i * 3000,
        });
      }
      emitido.length = 0;
      (service as any).difundirPendientes();

      const bus = emitido.find((e) => e.evento === 'viaje:ubicaciones')?.payload
        .buses;
      // 5 pings aceptados -> 1 entrada en el lote.
      expect(bus).toHaveLength(1);
    });
  });

  describe('reenganche tras caida de red', () => {
    it('el socket viejo se queda sin sesion y el nuevo recupera el viaje', async () => {
      const a = await service.iniciarViaje(1, 'conductor1', 'socket-1', dto);

      // Se cae la red: el viaje sigue abierto, el socket murio.
      service.marcarSesionOffline('socket-1');
      expect(service.getSesionDelSocket('socket-1')).toBeUndefined();
      expect(a.online).toBe(false);
      // Lo importante: el viaje NO se cerro.
      expect(service.getSesion(a.id_viaje)).toBeDefined();
      expect(viajesRepo.update).not.toHaveBeenCalledWith(
        { id_viaje: a.id_viaje },
        expect.objectContaining({ fecha_final: expect.anything() }),
      );

      // Vuelve con un socket nuevo.
      const { sesion, recuperado } = service.reconectar(
        1,
        'socket-2',
        a.id_viaje,
      );
      expect(recuperado).toBe(true);
      expect(sesion.socketId).toBe('socket-2');
      expect(sesion.online).toBe(true);
      expect(service.getSesionDelSocket('socket-2')?.id_viaje).toBe(a.id_viaje);
    });

    it('rechaza que otro conductor se enganche al viaje', async () => {
      const a = await service.iniciarViaje(1, 'conductor1', 'socket-1', dto);

      expect(() => service.reconectar(99, 'socket-9', a.id_viaje)).toThrow(
        'otro conductor',
      );
    });

    it('avisa si el viaje ya no existe (el reaper lo limpio)', () => {
      expect(() => service.reconectar(1, 'socket-2', 777)).toThrow(
        'ya no esta en curso',
      );
    });
  });

  describe('reaper de sesiones', () => {
    it('descarta la sesion de un viaje abierto hace mas de 24h y offline', async () => {
      const a = await service.iniciarViaje(1, 'conductor1', 'socket-1', dto);
      service.marcarSesionOffline('socket-1');
      // Se viaja 25 horas.
      a.fechaInicio = new Date(Date.now() - 25 * 60 * 60 * 1000);
      emitido.length = 0;

      (service as any).reaper();

      expect(service.getSesion(a.id_viaje)).toBeUndefined();
      expect(emitido).toContainEqual(
        expect.objectContaining({
          evento: 'viaje:descartado',
          payload: expect.objectContaining({ motivo: 'sesion_expirada' }),
        }),
      );
    });

    it('NO descarta un viaje largo que sigue online', async () => {
      const a = await service.iniciarViaje(1, 'conductor1', 'socket-1', dto);
      a.fechaInicio = new Date(Date.now() - 25 * 60 * 60 * 1000);

      (service as any).reaper();

      expect(service.getSesion(a.id_viaje)).toBeDefined();
    });
  });

  describe('finalizarViaje', () => {
    it('vuelca el buffer, setea fecha_final y avisa a las rooms', async () => {
      const sesion = await service.iniciarViaje(
        1,
        'conductor1',
        'socket-1',
        dto,
      );
      service.registrarUbicacion(sesion, {
        lat: 10.5,
        lng: -66.8,
        ts: sesion.lastLocation.ts + 5000,
      });
      emitido.length = 0;

      const r = await service.finalizarViaje(sesion, {});

      expect(ubicacionesRepo.insert).toHaveBeenCalled();
      expect(viajesRepo.update).toHaveBeenCalledWith(
        { id_viaje: 42 },
        { fecha_final: expect.any(Date) },
      );
      expect(emitido.map((e) => e.evento)).toEqual(
        expect.arrayContaining(['viaje:finalizado', 'viaje:cerrado']),
      );
      expect(r.id_viaje).toBe(42);
      // La sesion se elimina: el bus ya no esta en el mapa.
      expect(service.getSesion(42)).toBeUndefined();
    });
  });

  describe('desconexion', () => {
    it('marca offline pero NO cierra el viaje', async () => {
      await service.iniciarViaje(1, 'conductor1', 'socket-1', dto);

      const afectadas = service.marcarSesionOffline('socket-1');

      expect(afectadas).toHaveLength(1);
      expect(afectadas[0].online).toBe(false);
      // El viaje sigue vivo en BD: con senal LTE mala se reconecta en segundos.
      expect(viajesRepo.update).not.toHaveBeenCalledWith(
        { id_viaje: 42 },
        expect.objectContaining({ fecha_final: expect.anything() }),
      );
      expect(service.getSesion(42)).toBeDefined();
    });

    it('al reconectar vuelve a marcar online', async () => {
      const sesion = await service.iniciarViaje(
        1,
        'conductor1',
        'socket-1',
        dto,
      );
      service.marcarSesionOffline('socket-1');
      expect(sesion.online).toBe(false);

      service.registrarUbicacion(sesion, {
        lat: 10.6,
        lng: -66.7,
        ts: sesion.lastLocation.ts + 5000,
      });

      expect(sesion.online).toBe(true);
    });
  });
});
