import { Test, TestingModule } from '@nestjs/testing';
import { CooperativaService } from './coperativa.service';

// Suite de pruebas del servicio de cooperativas.
describe('CooperativaService', () => {
  let service: CooperativaService;

  // Antes de cada prueba se crea el módulo de testing con CooperativaService.
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CooperativaService],
    }).compile();

    service = module.get<CooperativaService>(CooperativaService);
  });

  // Verifica que el servicio se instancie correctamente.
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
