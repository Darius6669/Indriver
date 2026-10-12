import { Test, TestingModule } from '@nestjs/testing';
import { VehiculosService } from './vehiculos.service';

// Suite de pruebas del servicio de vehículos.
describe('VehiculosService', () => {
  let service: VehiculosService;

  // Antes de cada prueba se prepara el módulo de testing con VehiculosService.
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [VehiculosService],
    }).compile();

    service = module.get<VehiculosService>(VehiculosService);
  });

  // Verifica que el servicio se instancie correctamente.
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
