import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { WebsocketService } from './websocket.service';
import { ViajesEntity } from 'src/entidades/Viajes.entity';
import { ViajeUbicacionEntity } from 'src/entidades/ViajeUbicacion.entity';
import { RutaEntity } from 'src/entidades/ruta.entity';
import { VehiculosEntity } from 'src/entidades/vehiculos.entity';
import { IniciarViajeWsDto } from 'src/dtos/viajes/TrackingWs.dto';

/**
 * Pruebas unitarias de WebsocketService.
 *
 * Se mockean los 4 repositorios y el server de socket.io (solo registra a quien
 * se emite). Los tests crean sesiones reales con `iniciarViaje` y luego
 * verifican broadcast, persistencia (UPSERT), throttle, reaper y desconexion
 * contra los mocks.
 */
describe('WebsocketService', () => {
  let service: WebsocketService;

  /** Filas de `viaje` que devuelve el repo mock (las que creo el REST). */
  let viajes: Map<number, any>;

  /** Mock del repo de viajes: se leen al iniciar y se cierran con update. */
  const viajesRepo = {
    findOne: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
  };
  /** Mock del repo de posiciones: verifica que TODO vaya por UPSERT. */
  const ubicacionesRepo = {
    insert: jest.fn().mockResolvedValue({}),
    upsert: jest.fn().mockResolvedValue({}),
  };
  /** Mock del repo de rutas (da la cooperativa). */
  const rutaRepo = {
    findOne: jest.fn(),
  };
  /** Mock del repo de vehiculos. */
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

  /** Simula un viaje pre-creado por el REST, con sus relaciones cargadas. */
  const sembrarViaje = (
    idViaje: number,
    opciones: {
      userId?: number;
      placa?: string;
      ruta?: string;
      cooperativa?: string;
      fechaInicio?: Date;
      fechaFinal?: Date | null;
    } = {},
  ) => {
    const {
      userId = 1,
      placa = 'ABC123',
      ruta = 'R-01',
      cooperativa = 'J-123',
      fechaInicio = new Date(),
      fechaFinal = null,
    } = opciones;
    viajes.set(idViaje, {
      id_viaje: idViaje,
      fecha_inicio: fechaInicio,
      fecha_final: fechaFinal,
      usuario: { user_id: userId },
      vehiculo: { placa },
      ruta: {
        numero_ruta: ruta,
        cooperativa: { rif_cooperativa: cooperativa },
      },
    });
  };

  /** Fabrica un DTO de inicio valido para el id y placa dados. */
  const crearDto = (
    idViaje: number,
    placa: string,
    ruta = 'R-01',
  ): IniciarViajeWsDto =>
    Object.assign(new IniciarViajeWsDto(), {
      id_viaje: idViaje,
      id_ruta: ruta,
      id_vehiculo: placa,
      lat: 10.4806,
      lng: -66.9036,
    });

  // Bus A: conductor1 / ABC123 / R-01 (viaje 42)
  const dtoA = crearDto(42, 'ABC123');
  // Bus B: conductor2 / DEF456 / R-01 (viaje 43)
  const dtoB = crearDto(43, 'DEF456');

  /**
   * Antes de cada test: limpia mocks, siembra los viajes 42 y 43 del REST,
   * compila el modulo con los 4 repos y registra el fakeServer (arranca los
   * timers, que despues se frenan en afterEach con onModuleDestroy).
   */
  beforeEach(async () => {
    jest.clearAllMocks();
    emitido.length = 0;
    viajes = new Map();
    sembrarViaje(42, { userId: 1, placa: 'ABC123' });
    sembrarViaje(43, { userId: 2, placa: 'DEF456' });
    viajesRepo.findOne.mockImplementation(
      async ({ where }: { where: { id_viaje: number } }) =>
        viajes.get(where.id_viaje) ?? null,
    );
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

  /** Apaga los timers y vuelca buffers: deja el estado limpio para el proximo. */
  afterEach(async () => {
    await service.onModuleDestroy();
  });

  describe('iniciarViaje', () => {
    it('reutiliza el viaje creado por el REST (no inserta una fila nueva)', async () => {
      const sesion = await service.iniciarViaje(
        1,
        'conductor1',
        'socket-1',
        dtoA,
      );

      expect(viajesRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id_viaje: 42 } }),
      );
      // La clave del fix: el viaje ya existia, el socket solo lo "enciende".
      expect(sesion.id_viaje).toBe(42);
      expect(service.getSesion(42)).toBeDefined();
    });

    it('registra la sesion y la deja disponible por socket', async () => {
      const sesion = await service.iniciarViaje(
        1,
        'conductor1',
        'socket-1',
        dtoA,
      );

      expect(sesion.id_viaje).toBe(42);
      expect(service.getSesion(42)).toBeDefined();
      expect(service.getSesionDelSocket('socket-1')?.id_viaje).toBe(42);
    });

    it('avisa a los que ya estaban suscritos a la ruta', async () => {
      await service.iniciarViaje(1, 'conductor1', 'socket-1', dtoA);

      expect(emitido).toContainEqual(
        expect.objectContaining({
          room: 'ruta:R-01',
          evento: 'viaje:disponible',
        }),
      );
    });

    it('rechaza un viaje inexistente', async () => {
      await expect(
        service.iniciarViaje(
          1,
          'conductor1',
          'socket-1',
          crearDto(999, 'ABC123'),
        ),
      ).rejects.toThrow(/999 no existe/);
    });

    it('rechaza un viaje que pertenece a otro conductor', async () => {
      await expect(
        service.iniciarViaje(7, 'intruso', 'socket-1', dtoA),
      ).rejects.toThrow(/otro conductor/);
    });

    it('rechaza un viaje ya finalizado', async () => {
      viajes.get(42).fecha_final = new Date();

      await expect(
        service.iniciarViaje(1, 'conductor1', 'socket-1', dtoA),
      ).rejects.toThrow(/ya fue finalizado/);
    });

    it('bloquea un segundo viaje de la misma placa', async () => {
      await service.iniciarViaje(1, 'conductor1', 'socket-1', dtoA);
      sembrarViaje(44, { userId: 3, placa: 'ABC123' });

      await expect(
        service.iniciarViaje(
          3,
          'conductor3',
          'socket-3',
          crearDto(44, 'ABC123'),
        ),
      ).rejects.toThrow(/ya tiene el viaje 42 en curso/);
    });

    it('es idempotente: el mismo viaje retomado por otro socket no se duplica', async () => {
      const a = await service.iniciarViaje(1, 'conductor1', 'socket-1', dtoA);
      const b = await service.iniciarViaje(1, 'conductor1', 'socket-2', dtoA);

      expect(b).toBe(a);
      expect(b.socketId).toBe('socket-2');
      expect(service.getSesionDelSocket('socket-2')?.id_viaje).toBe(42);
    });
  });

  describe('registrarUbicacion', () => {
    it('acepta un punto y lo difunde a la room de la ruta', async () => {
      const sesion = await service.iniciarViaje(
        1,
        'conductor1',
        'socket-1',
        dtoA,
      );
      emitido.length = 0;

      const r = service.registrarUbicacion(sesion, {
        id_viaje: 42,
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
        dtoA,
      );

      const r = service.registrarUbicacion(sesion, {
        id_viaje: 42,
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
        dtoA,
      );

      const r = service.registrarUbicacion(sesion, {
        id_viaje: 42,
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
        dtoA,
      );
      // Greenwich / Ecuador es una coordenada legitima: el codigo viejo la
      // rechazaba por ser falsy.
      const r = service.registrarUbicacion(sesion, {
        id_viaje: 42,
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
      await service.iniciarViaje(1, 'conductor1', 'socket-1', dtoA);
      await service.iniciarViaje(2, 'conductor2', 'socket-2', dtoB);

      const todas = service.snapshotTodos();
      const deR01 = service.snapshotRuta('R-01');
      const deR99 = service.snapshotRuta('R-99');

      expect(todas.total).toBe(2);
      expect(deR01.total).toBe(2);
      expect(deR99.total).toBe(0);
    });
  });

  describe('persistencia de la posicion (una fila por viaje)', () => {
    it('guarda el ultimo punto en viaje_ubicacion y NO acumula historial', async () => {
      const a = await service.iniciarViaje(1, 'conductor1', 'socket-1', dtoA);
      const b = await service.iniciarViaje(2, 'conductor2', 'socket-2', dtoB);

      for (let i = 1; i <= 4; i++) {
        service.registrarUbicacion(a, {
          id_viaje: a.id_viaje,
          lat: 10.4806 + i * 0.001,
          lng: -66.9036,
          ts: a.lastLocation.ts + i * 5000,
        });
        service.registrarUbicacion(b, {
          id_viaje: b.id_viaje,
          lat: 10.5006 + i * 0.001,
          lng: -66.8036,
          ts: b.lastLocation.ts + i * 5000,
        });
      }

      await service.onModuleDestroy();

      // Nunca se hace INSERT append-only: todo pasa por UPSERT.
      expect(ubicacionesRepo.insert).not.toHaveBeenCalled();

      // El ultimo UPSERT del viaje A lleva su ultimo punto conocido.
      const upsertsDeA = ubicacionesRepo.upsert.mock.calls.filter(
        ([fila]) => fila.id_viaje === a.id_viaje,
      );
      expect(upsertsDeA.length).toBeGreaterThan(0);
      expect(upsertsDeA.at(-1)?.[0]).toEqual(
        expect.objectContaining({
          id_viaje: a.id_viaje,
          lactitud: 10.4806 + 4 * 0.001,
          longitud: -66.9036,
        }),
      );
      expect(upsertsDeA.at(-1)?.[1]).toEqual(['id_viaje']);

      // La tabla `viaje` ya no recibe la posicion.
      expect(viajesRepo.update).not.toHaveBeenCalledWith(
        expect.objectContaining({ id_viaje: a.id_viaje }),
        expect.objectContaining({ lactitud: expect.anything() }),
      );
    });

    it('baja la ultima posicion a viaje_ubicacion', async () => {
      const a = await service.iniciarViaje(1, 'conductor1', 'socket-1', dtoA);

      service.registrarUbicacion(a, {
        id_viaje: a.id_viaje,
        lat: 10.55,
        lng: -66.75,
        ts: a.lastLocation.ts + 5000,
      });
      // El throttle arranca al abrir el viaje: se simulan 30s de marcha.
      a.lastDbUpdateAt = Date.now() - 30_001;

      await (service as any).tick();

      expect(ubicacionesRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id_viaje: a.id_viaje,
          lactitud: 10.55,
          longitud: -66.75,
        }),
        ['id_viaje'],
      );
      // La posicion quedo persistida, no solo en memoria.
      expect(a.pendingDbUpdate).toBe(false);
    });
  });

  describe('refresco de la ultima posicion (el bug que se corrigio)', () => {
    it('SI actualiza viaje_ubicacion durante el viaje, con throttle', async () => {
      const a = await service.iniciarViaje(1, 'conductor1', 'socket-1', dtoA);

      service.registrarUbicacion(a, {
        id_viaje: a.id_viaje,
        lat: 10.55,
        lng: -66.75,
        ts: a.lastLocation.ts + 5000,
      });

      // El bug era que tick() nunca llamaba a refrescarUltimasUbicaciones(),
      // asi que el endpoint de ultima ubicacion devolvia la posicion INICIAL.
      // Aqui se comprueba que el UPSERT ocurre, no que no ocurra.
      expect(a.pendingDbUpdate).toBe(true);
      // El throttle arranca al abrir el viaje: hay que simular 30s de marcha.
      a.lastDbUpdateAt = Date.now() - 30_001;
      await (service as any).tick();

      expect(ubicacionesRepo.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          id_viaje: a.id_viaje,
          lactitud: 10.55,
          longitud: -66.75,
        }),
        ['id_viaje'],
      );
      expect(a.pendingDbUpdate).toBe(false);
    });

    it('respeta el throttle de 30s: no actualiza en cada ping', async () => {
      const a = await service.iniciarViaje(1, 'conductor1', 'socket-1', dtoA);
      a.lastDbUpdateAt = Date.now() - 30_001;

      // Primer punto: se actualiza y arranca el reloj del throttle.
      service.registrarUbicacion(a, {
        id_viaje: a.id_viaje,
        lat: 10.55,
        lng: -66.75,
        ts: a.lastLocation.ts + 5000,
      });
      await (service as any).tick();
      const llamadas = ubicacionesRepo.upsert.mock.calls.length;
      expect(llamadas).toBeGreaterThan(0);

      // Segundo punto 5s despues: el throttle lo salta.
      service.registrarUbicacion(a, {
        id_viaje: a.id_viaje,
        lat: 10.6,
        lng: -66.7,
        ts: a.lastLocation.ts + 10000,
      });
      await (service as any).tick();
      expect(ubicacionesRepo.upsert.mock.calls.length).toBe(llamadas);

      // Pero queda pendiente, no se pierde.
      expect(a.pendingDbUpdate).toBe(true);
    });
  });

  describe('batching del broadcast', () => {
    it('emite UN mensaje por ruta, no uno por bus', async () => {
      const a = await service.iniciarViaje(1, 'conductor1', 'socket-1', dtoA);
      const b = await service.iniciarViaje(2, 'conductor2', 'socket-2', dtoB);
      service.registrarUbicacion(a, {
        id_viaje: a.id_viaje,
        lat: 10.55,
        lng: -66.75,
        ts: a.lastLocation.ts + 5000,
      });
      service.registrarUbicacion(b, {
        id_viaje: b.id_viaje,
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
      const a = await service.iniciarViaje(1, 'conductor1', 'socket-1', dtoA);
      service.registrarUbicacion(a, {
        id_viaje: a.id_viaje,
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
      const a = await service.iniciarViaje(1, 'conductor1', 'socket-1', dtoA);
      for (let i = 1; i <= 5; i++) {
        service.registrarUbicacion(a, {
          id_viaje: a.id_viaje,
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
      const a = await service.iniciarViaje(1, 'conductor1', 'socket-1', dtoA);

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
      const a = await service.iniciarViaje(1, 'conductor1', 'socket-1', dtoA);

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
      const a = await service.iniciarViaje(1, 'conductor1', 'socket-1', dtoA);
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
      const a = await service.iniciarViaje(1, 'conductor1', 'socket-1', dtoA);
      a.fechaInicio = new Date(Date.now() - 25 * 60 * 60 * 1000);

      (service as any).reaper();

      expect(service.getSesion(a.id_viaje)).toBeDefined();
    });
  });

  describe('finalizarViaje', () => {
    it('persiste la ultima posicion, setea fecha_final y avisa a las rooms', async () => {
      const sesion = await service.iniciarViaje(
        1,
        'conductor1',
        'socket-1',
        dtoA,
      );
      service.registrarUbicacion(sesion, {
        id_viaje: sesion.id_viaje,
        lat: 10.5,
        lng: -66.8,
        ts: sesion.lastLocation.ts + 5000,
      });
      emitido.length = 0;

      const r = await service.finalizarViaje(sesion, { id_viaje: 42 });

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
      await service.iniciarViaje(1, 'conductor1', 'socket-1', dtoA);

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
        dtoA,
      );
      service.marcarSesionOffline('socket-1');
      expect(sesion.online).toBe(false);

      service.registrarUbicacion(sesion, {
        id_viaje: sesion.id_viaje,
        lat: 10.6,
        lng: -66.7,
        ts: sesion.lastLocation.ts + 5000,
      });

      expect(sesion.online).toBe(true);
    });
  });
});
