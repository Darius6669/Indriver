import { Test, TestingModule } from '@nestjs/testing';
import { IncidenciasController } from './incidencias.controller';
import { IncidenciasService } from './incidencias.service';

/**
 * Pruebas unitarias básicas del IncidenciasController.
 * Solo verifican que el controlador se instancie correctamente.
 */
describe('IncidenciasController', () => {
  let controller: IncidenciasController;

  // Monta el módulo de prueba con el controlador y su servicio real.
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IncidenciasController],
      providers: [IncidenciasService],
    }).compile();

    controller = module.get<IncidenciasController>(IncidenciasController);
  });

  // Confirma que el controlador quedó correctamente inyectado.
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
