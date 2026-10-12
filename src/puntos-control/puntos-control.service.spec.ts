import { Test, TestingModule } from '@nestjs/testing';
import { PuntosControlService } from './puntos-control.service';

/**
 * Pruebas unitarias básicas del PuntosControlService.
 * Verifican únicamente que el servicio se instancie.
 */
describe('PuntosControlService', () => {
  let service: PuntosControlService;

  // Crea el módulo de prueba con el servicio real como proveedor.
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PuntosControlService],
    }).compile();

    service = module.get<PuntosControlService>(PuntosControlService);
  });

  // Confirma que el servicio quedó inyectado correctamente.
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
