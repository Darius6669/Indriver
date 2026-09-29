import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ViajesService } from './viajes.service';
import { ViajesEntity } from 'src/entidades/Viajes.entity';
import { ViajeUbicacionEntity } from 'src/entidades/ViajeUbicacion.entity';
import { UsuariosEntity } from 'src/entidades/Usuarios.entity';
import { IncidenciasEntity } from 'src/entidades/Incidencias.entity';
import { VehiculosEntity } from 'src/entidades/vehiculos.entity';
import { RutaEntity } from 'src/entidades/ruta.entity';
import { WebsocketService } from 'src/websocket/websocket.service';

describe('ViajesService', () => {
  let service: ViajesService;

  const viajesRepo = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((dto) => ({ ...dto })),
    save: jest.fn(),
    update: jest.fn().mockResolvedValue({}),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  };
  const tracking = {
    posicionesVivas: jest.fn(() => new Map()),
  };
  const ubicacionesRepo = {
    insert: jest.fn().mockResolvedValue({}),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([]),
    })),
  };
  const ok = { findOne: jest.fn().mockResolvedValue({}) };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ViajesService,
        { provide: getRepositoryToken(ViajesEntity), useValue: viajesRepo },
        {
          provide: getRepositoryToken(ViajeUbicacionEntity),
          useValue: ubicacionesRepo,
        },
        { provide: getRepositoryToken(RutaEntity), useValue: ok },
        { provide: getRepositoryToken(UsuariosEntity), useValue: ok },
        { provide: getRepositoryToken(VehiculosEntity), useValue: ok },
        { provide: getRepositoryToken(IncidenciasEntity), useValue: ok },
        { provide: WebsocketService, useValue: tracking },
      ],
    }).compile();

    service = module.get<ViajesService>(ViajesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('ObtenerUltimaUbicacion', () => {
    it('marca en_curso cuando fecha_final es null', async () => {
      viajesRepo.findOne.mockResolvedValueOnce({
        id_viaje: 1,
        lactitud: 10.48,
        longitud: -66.9,
        fecha_inicio: new Date(),
        fecha_final: null,
      });

      const r = await service.ObtenerUltimaUbicacion(1);

      expect(r.en_curso).toBe(true);
      expect(r.lat).toBe(10.48);
    });

    it('lanza NotFound si el viaje no existe', async () => {
      viajesRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.ObtenerUltimaUbicacion(99)).rejects.toThrow(
        /no existe/,
      );
    });
  });

  describe('RegistrarUbicacionManual', () => {
    it('actualiza la fila del viaje y anade el punto al historial', async () => {
      viajesRepo.findOne.mockResolvedValue({
        id_viaje: 1,
        lactitud: 10.5,
        longitud: -66.8,
        fecha_inicio: new Date(),
        fecha_final: null,
      });

      await service.RegistrarUbicacionManual(1, 10.5, -66.8);

      expect(viajesRepo.update).toHaveBeenCalledWith(
        { id_viaje: 1 },
        { lactitud: 10.5, longitud: -66.8 },
      );
      expect(ubicacionesRepo.insert).toHaveBeenCalledWith(
        expect.objectContaining({ id_viaje: 1, lactitud: 10.5 }),
      );
    });
  });

  describe('ObtenerRecorrido', () => {
    it('devuelve la polilinea en orden cronologico', async () => {
      viajesRepo.findOne.mockResolvedValueOnce({ id_viaje: 1 });
      ubicacionesRepo.createQueryBuilder = jest.fn(() => ({
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          {
            lactitud: 10.48,
            longitud: -66.9,
            velocidad: 30,
            rumbo: 90,
            recorded_at: new Date(),
          },
          {
            lactitud: 10.5,
            longitud: -66.8,
            velocidad: 40,
            rumbo: 95,
            recorded_at: new Date(),
          },
        ]),
      }));

      const r = await service.ObtenerRecorrido(1, 6);

      expect(r.total).toBe(2);
      expect(r.recorrido[0]).toEqual(
        expect.objectContaining({ lat: 10.48, lng: -66.9 }),
      );
    });
  });

  describe('ObtenerViajesCercanos', () => {
    // Caracas. 0.001 grado de latitud ~= 111 metros.
    const YO = { lat: 10.4806, lng: -66.9036 };

    const busEnBd = (id: number, lat: number, lng: number) => ({
      id_viaje: id,
      lactitud: lat,
      longitud: lng,
      usuario: { username: `chofer${id}` },
      vehiculo: { placa: `P-${id}` },
      ruta: { numero_ruta: 'RUTA-001', nombre: 'Ruta Norte' },
    });

    const mockCandidatos = (filas: unknown[]) => {
      viajesRepo.createQueryBuilder.mockReturnValueOnce({
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(filas),
      } as never);
    };

    it('devuelve los buses del radio ordenados de mas cerca a mas lejos', async () => {
      mockCandidatos([
        busEnBd(1, 10.4806, -66.9036), // aqui mismo, ~0 m
        busEnBd(2, 10.4906, -66.9036), // ~1110 m
        busEnBd(3, 10.4856, -66.9036), // ~555 m
      ]);

      const r = await service.ObtenerViajesCercanos(YO.lat, YO.lng, 5000);

      expect(r.map((b) => b.id_viaje)).toEqual([1, 3, 2]);
      expect(r[0].distancia_m).toBe(0);
      // Y de mayor a menor, que es como lo va a pintar un mapa.
      expect(r[0].distancia_m).toBeLessThan(r[1].distancia_m);
      expect(r[1].distancia_m).toBeLessThan(r[2].distancia_m);
    });

    it('descarta el bus que cae fuera del radio', async () => {
      mockCandidatos([
        busEnBd(1, 10.4806, -66.9036),
        busEnBd(9, 11.5, -66.9036), // ~113 km al norte
      ]);

      const r = await service.ObtenerViajesCercanos(YO.lat, YO.lng, 1000);

      expect(r).toHaveLength(1);
      expect(r[0].id_viaje).toBe(1);
    });

    it('respeta el limite pedido', async () => {
      mockCandidatos([
        busEnBd(1, 10.4806, -66.9036),
        busEnBd(2, 10.4816, -66.9036),
        busEnBd(3, 10.4826, -66.9036),
      ]);

      const r = await service.ObtenerViajesCercanos(YO.lat, YO.lng, 5000, 2);

      expect(r).toHaveLength(2);
    });

    it('topa el limite en 100 aunque pidan 10000', async () => {
      mockCandidatos([]);
      await service.ObtenerViajesCercanos(YO.lat, YO.lng, 5000, 10000);
      // el .limit() del QB se llama con el tope, no con 10000
      const qb = viajesRepo.createQueryBuilder.mock.results[0].value;
      expect(qb.limit).toHaveBeenCalledWith(300);
    });

    it('usa la posicion EN VIVO cuando el socket la tiene', async () => {
      // En la BD el bus 1 esta a 1 km, pero el GPS lo movio a 200 m.
      mockCandidatos([busEnBd(1, 10.49, -66.9036)]);
      tracking.posicionesVivas.mockReturnValueOnce(
        new Map([
          [
            1,
            {
              id_viaje: 1,
              username: 'chofer1',
              placa: 'P-1',
              numero_ruta: 'RUTA-001',
              cooperativa: 'COOP-001',
              online: true,
              fecha_inicio: new Date().toISOString(),
              ultima_ubicacion: {
                lat: 10.4824,
                lng: -66.9036,
                velocidad: 33,
                rumbo: 90,
                precision: 8,
                ts: 1_700_000_000_000,
              },
            },
          ],
        ]),
      );

      const r = await service.ObtenerViajesCercanos(YO.lat, YO.lng, 500);

      // Sin esto, un radio de 500 m lo habria descartado por la posicion vieja.
      expect(r).toHaveLength(1);
      expect(r[0].posicion_en_vivo).toBe(true);
      expect(r[0].online).toBe(true);
      expect(r[0].velocidad).toBe(33);
      expect(r[0].ts_actualizacion).toBe(1_700_000_000_000);
    });

    it('marca offline cuando no hay sesion viva', async () => {
      mockCandidatos([busEnBd(1, 10.4806, -66.9036)]);

      const r = await service.ObtenerViajesCercanos(YO.lat, YO.lng, 1000);

      expect(r[0].online).toBe(false);
      expect(r[0].posicion_en_vivo).toBe(false);
      // Pero igual lo muestra: el bus sigue en la calle, solo que sin senal.
      expect(r[0].distancia_m).toBe(0);
    });

    it('con soloOnline=true esconde los que no tienen socket', async () => {
      mockCandidatos([
        busEnBd(1, 10.4806, -66.9036),
        busEnBd(2, 10.4816, -66.9036),
      ]);
      tracking.posicionesVivas.mockReturnValueOnce(
        new Map([
          [
            2,
            {
              id_viaje: 2,
              online: true,
              ultima_ubicacion: {
                lat: 10.4816,
                lng: -66.9036,
                velocidad: 10,
                rumbo: 0,
                precision: 5,
                ts: 1,
              },
            },
          ],
        ]) as never,
      );

      const r = await service.ObtenerViajesCercanos(
        YO.lat,
        YO.lng,
        1000,
        20,
        true,
      );

      expect(r.map((b) => b.id_viaje)).toEqual([2]);
    });

    it('aguanta el radio en el ecuador sin reventar', async () => {
      mockCandidatos([]);
      // En el ecuador 1 grado de longitud son los mismos ~111 km que el de
      // latitud: es el caso donde la caja envolvente se hace enorme.
      const r = await service.ObtenerViajesCercanos(0, 0, 1000);
      expect(r).toEqual([]);
    });

    it('topa el radio a 50 km aunque pidan 500 km', async () => {
      mockCandidatos([]);
      await service.ObtenerViajesCercanos(YO.lat, YO.lng, 500_000);
      const qb = viajesRepo.createQueryBuilder.mock.results[0].value;
      // 50000 m / 111320 ~= 0.449 grados de margen de latitud
      const [, params] = qb.andWhere.mock.calls[0];
      expect(params.latMax - params.latMin).toBeCloseTo(
        (50_000 / 111_320) * 2,
        6,
      );
    });
  });
});
