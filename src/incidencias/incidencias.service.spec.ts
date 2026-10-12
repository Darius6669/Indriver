import { Test, TestingModule } from '@nestjs/testing';
import { IncidenciasService } from './incidencias.service';

/**
 * Pruebas unitarias básicas del IncidenciasService.
 * Verifican únicamente que el servicio se instancie.
 */
describe('IncidenciasService', () => {
  let service: IncidenciasService;

  // Crea el módulo de prueba con el servicio real como proveedor.
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IncidenciasService],
    }).compile();

    service = module.get<IncidenciasService>(IncidenciasService);
  });

  // Confirma que el servicio quedó inyectado correctamente.
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
