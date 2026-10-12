import { Test, TestingModule } from '@nestjs/testing';
import { RutasController } from './rutas.controller';
import { RutasService } from './rutas.service';

/**
 * Pruebas unitarias básicas del RutasController.
 * Solo verifican que el controlador se instancie correctamente.
 */
describe('RutasController', () => {
  let controller: RutasController;

  // Monta un módulo de prueba creando el controlador junto con el servicio real.
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RutasController],
      providers: [RutasService],
    }).compile();

    controller = module.get<RutasController>(RutasController);
  });

  // Comprueba que el controlador quedó correctamente inyectado y definido.
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
