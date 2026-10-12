import { Test, TestingModule } from '@nestjs/testing';
import { PuntosControlController } from './puntos-control.controller';
import { PuntosControlService } from './puntos-control.service';

/**
 * Pruebas unitarias básicas del PuntosControlController.
 * Solo comprueban que el controlador se instancie correctamente.
 */
describe('PuntosControlController', () => {
  let controller: PuntosControlController;

  // Monta el módulo de prueba con el controlador y su servicio real.
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PuntosControlController],
      providers: [PuntosControlService],
    }).compile();

    controller = module.get<PuntosControlController>(PuntosControlController);
  });

  // Verifica que el controlador quedó definido tras la inyección.
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
