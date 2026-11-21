import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RutaEntity } from 'src/entidades/ruta.entity';
import { CooperativaEntity } from 'src/entidades/cooperativa.entity';
import { ControlRutaEntity } from 'src/entidades/ControlRuta.entity';
import { RutaParadaEntity } from 'src/entidades/ruta-parada.entity';
import { RutasService } from './rutas.service';

/**
 * Pruebas unitarias básicas del RutasService.
 * Verifican únicamente que el servicio se instancie.
 */
describe('RutasService', () => {
  let service: RutasService;
  const rutaRepository = { find: jest.fn() };

  // Crea un módulo de prueba cuyo proveedor es el servicio real.
  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RutasService,
        { provide: getRepositoryToken(RutaEntity), useValue: rutaRepository },
        { provide: getRepositoryToken(CooperativaEntity), useValue: {} },
        { provide: getRepositoryToken(ControlRutaEntity), useValue: {} },
        { provide: getRepositoryToken(RutaParadaEntity), useValue: {} },
      ],
    }).compile();

    service = module.get<RutasService>(RutasService);
  });

  // Asegura que el servicio quedó correctamente inyectado.
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('filtra rutas por el identificador de cooperativa', async () => {
    rutaRepository.find.mockResolvedValue([]);

    await service.obtenerRutasPorCooperativa('J-12345678-1');

    expect(rutaRepository.find).toHaveBeenCalledWith({
      where: { cooperativa: { rif_cooperativa: 'J-12345678-1' } },
      relations: ['cooperativa'],
    });
  });
});
