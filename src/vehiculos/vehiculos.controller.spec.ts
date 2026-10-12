import { Test, TestingModule } from '@nestjs/testing';
import { VehiculosController } from './vehiculos.controller';
import { VehiculosService } from './vehiculos.service';

// Suite de pruebas del controlador de vehículos.
describe('VehiculosController', () => {
  let controller: VehiculosController;

  // Antes de cada prueba se crea el módulo de testing con controlador y servicio.
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [VehiculosController],
      providers: [VehiculosService],
    }).compile();

    controller = module.get<VehiculosController>(VehiculosController);
  });

  // Verifica que el controlador se instancie correctamente.
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
