import { Test, TestingModule } from '@nestjs/testing';
import { PersonasService } from './personas.service';

// Suite de pruebas del servicio de personas.
describe('PersonasService', () => {
  let service: PersonasService;

  // Antes de cada prueba se prepara el módulo de testing con PersonasService.
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PersonasService],
    }).compile();

    service = module.get<PersonasService>(PersonasService);
  });

  // Verifica que el servicio se instancie correctamente.
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
