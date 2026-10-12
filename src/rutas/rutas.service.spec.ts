import { Test, TestingModule } from '@nestjs/testing';
import { RutasService } from './rutas.service';

/**
 * Pruebas unitarias básicas del RutasService.
 * Verifican únicamente que el servicio se instancie.
 */
describe('RutasService', () => {
  let service: RutasService;

  // Crea un módulo de prueba cuyo proveedor es el servicio real.
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RutasService],
    }).compile();

    service = module.get<RutasService>(RutasService);
  });

  // Asegura que el servicio quedó correctamente inyectado.
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
