import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

/** Pruebas del AppController sobre su endpoint de saludo. */
describe('AppController', () => {
  let appController: AppController;

  // Antes de cada test arma un módulo con el controlador y el AppService reales
  // y rescata la instancia del controlador para invocarla directamente.
  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  // Agrupa las pruebas del endpoint raíz.
  describe('root', () => {
    // El endpoint GET / debe retornar el saludo del AppService.
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
