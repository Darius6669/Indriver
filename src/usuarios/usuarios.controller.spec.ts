import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

// Suite de pruebas del controlador de usuarios.
describe('UsuariosController', () => {
  let controller: UsuariosController;

  // Antes de cada prueba se levanta un módulo de testing con el controlador y su
  // servicio registrado, y se obtiene la instancia del controlador a probar.
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsuariosController],
      providers: [UsuariosService],
    }).compile();

    controller = module.get<UsuariosController>(UsuariosController);
  });

  // Verifica que el controlador se instancie correctamente (no es null/undefined).
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
