import { Test, TestingModule } from '@nestjs/testing';
import { ViajesController } from './viajes.controller';
import { ViajesService } from './viajes.service';

/**
 * Smoke test del controller de viajes.
 *
 * Solo verifica que el modulo NestJS se arma y que ViajesController queda
 * correctamente instanciado (la inyeccion funciona). El comportamiento real de
 * cada endpoint no se prueba aqui: vive en viajes.service.spec.ts.
 */
describe('ViajesController', () => {
  let controller: ViajesController;

  /**
   * Compila un TestingModule con el controller y el service registrados, y
   * obtiene la instancia inyectada. No se mockean repositorios porque ningun
   * test de este archivo ejerce metodos.
   */
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ViajesController],
      providers: [ViajesService],
    }).compile();

    controller = module.get<ViajesController>(ViajesController);
  });

  /** Tras el arranque del modulo, el controller existe y esta listo. */
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
