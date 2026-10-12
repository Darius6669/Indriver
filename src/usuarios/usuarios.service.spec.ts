import { Test, TestingModule } from '@nestjs/testing';
import { UsuariosService } from './usuarios.service';

// Suite de pruebas del servicio de usuarios.
describe('UsuariosService', () => {
  let service: UsuariosService;

  // Antes de cada prueba se crea un módulo de testing con UsuariosService y se
  // obtiene la instancia a probar.
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UsuariosService],
    }).compile();

    service = module.get<UsuariosService>(UsuariosService);
  });

  // Verifica que el servicio se instancie correctamente.
  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
