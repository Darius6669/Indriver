import { Test, TestingModule } from '@nestjs/testing';
import { CoperativaController } from './coperativa.controller';
import { CooperativaService } from './coperativa.service';

// Suite de pruebas del controlador de cooperativas.
describe('CoperativaController', () => {
  let controller: CoperativaController;

  // Antes de cada prueba se crea el módulo de testing con controlador y servicio.
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoperativaController],
      providers: [CooperativaService],
    }).compile();

    controller = module.get<CoperativaController>(CoperativaController);
  });

  // Verifica que el controlador se instancie correctamente.
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
