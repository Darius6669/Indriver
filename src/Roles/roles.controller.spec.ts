import { Test, TestingModule } from '@nestjs/testing';
import { RolesController } from './roles.controller';
import { RolesService } from './roles.service';

/** Pruebas del RolesController; solo verifica su instanciación. */
describe('RolesController', () => {
  let controller: RolesController;

  // Monta el módulo con el controlador y su servicio real, y obtiene el controller.
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RolesController],
      providers: [RolesService],
    }).compile();

    controller = module.get<RolesController>(RolesController);
  });

  // Comprueba que el controlador quedó correctamente instanciado.
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
