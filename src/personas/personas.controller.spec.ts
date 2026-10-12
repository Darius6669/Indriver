import { Test, TestingModule } from '@nestjs/testing';
import { PersonasController } from './personas.controller';
import { PersonasService } from './personas.service';

// Suite de pruebas del controlador de personas.
describe('PersonasController', () => {
  let controller: PersonasController;

  // Antes de cada prueba se levanta el módulo de testing con el controlador y su
  // servicio, y se obtiene la instancia del controlador.
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PersonasController],
      providers: [PersonasService],
    }).compile();

    controller = module.get<PersonasController>(PersonasController);
  });

  // Verifica que el controlador se instancie correctamente.
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
