import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/**
 * Pruebas del AuthController.
 * Mockea AuthService para aislar el controlador y verifica que delega el
 * login correctamente y propaga los errores del servicio.
 */
describe('AuthController', () => {
  let controller: AuthController;

  // Mock del AuthService: solo nos interesa cómo lo llama el controlador.
  const authService = {
    Login: jest.fn(),
  };

  // Antes de cada test limpia los mocks y monta el módulo con el mock inyectado.
  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  // Comprueba que el controlador quedó correctamente instanciado.
  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // El login debe llamar al servicio con usuario/clave y devolver el token.
  it('login delega en el servicio y devuelve el token', async () => {
    authService.Login.mockResolvedValue({
      user: 'conductor_test',
      token: 'token-firmado',
    });

    const r = await controller.Login({
      username: 'conductor_test',
      password: 'clave123',
    });

    expect(authService.Login).toHaveBeenCalledWith(
      'conductor_test',
      'clave123',
    );
    expect(r.control.token).toBe('token-firmado');
  });

  // Si el servicio rechaza (credenciales/rol inválido), el error debe propagarse.
  it('propaga el error si el login falla', async () => {
    authService.Login.mockRejectedValue(new Error('rol invalido'));

    await expect(
      controller.Login({ username: 'x', password: 'y' }),
    ).rejects.toThrow('rol invalido');
  });
});
