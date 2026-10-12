import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AuthService } from './auth.service';
import { UsuariosService } from 'src/usuarios/usuarios.service';

// Reemplaza bcrypt por un mock global para controlar el resultado del compare.
jest.mock('bcrypt', () => ({ compare: jest.fn() }));

/**
 * Pruebas del AuthService.
 * Mockea UsuariosService, JwtService y bcrypt para verificar la cadena de
 * validaciones del login (contraseña, estado y rol) y la firma del token.
 */
describe('AuthService', () => {
  let service: AuthService;

  const compare = bcrypt.compare as jest.Mock;

  // Mocks de las dependencias externas del servicio.
  const usuariosService = {
    validarUsuario: jest.fn(),
  };
  const jwtService = {
    sign: jest.fn().mockReturnValue('token-firmado'),
  };

  // Fábrica de usuario de prueba; permite sobreescribir campos por caso.
  const usuario = (overrides: Record<string, unknown> = {}) => ({
    user_id: 1,
    username: 'conductor_test',
    contrasena: 'hash',
    status: true,
    rol: 'Conductor',
    ...overrides,
  });

  // Antes de cada test limpia mocks, deja el compare en true y monta el módulo.
  beforeEach(async () => {
    jest.clearAllMocks();
    compare.mockResolvedValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsuariosService, useValue: usuariosService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // Comprueba que el servicio quedó correctamente instanciado.
  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // Con credenciales correctas y rol válido debe firmar con el payload esperado.
  it('firma el token cuando el rol es valido', async () => {
    usuariosService.validarUsuario.mockResolvedValue(usuario());

    const r = await service.Login('conductor_test', 'clave123');

    expect(r.token).toBe('token-firmado');
    expect(jwtService.sign).toHaveBeenCalledWith({
      user_id: 1,
      username: 'conductor_test',
      rol: 'Conductor',
    });
  });

  // Prueba parametrizada: cada uno de los tres roles permitidos debe firmar.
  it.each(['Conductor', 'Admin', 'Superadmin'])(
    'acepta el rol valido %s',
    async (rol) => {
      usuariosService.validarUsuario.mockResolvedValue(usuario({ rol }));
      await expect(
        service.Login('conductor_test', 'clave123'),
      ).resolves.toHaveProperty('token');
    },
  );

  // Un rol fuera de la lista debe lanzar Unauthorized y no firmar token.
  it('rechaza un rol NO valido y NO firma token', async () => {
    usuariosService.validarUsuario.mockResolvedValue(usuario({ rol: 'user' }));

    await expect(
      service.Login('conductor_test', 'clave123'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  // Un rol vacío/nulo tampoco es válido y detiene la firma del token.
  it('rechaza rol vacio y NO firma token', async () => {
    usuariosService.validarUsuario.mockResolvedValue(usuario({ rol: '' }));

    await expect(
      service.Login('conductor_test', 'clave123'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  // Si bcrypt.compare devuelve false, debe rechazar sin firmar el token.
  it('rechaza si la contrasena es incorrecta', async () => {
    usuariosService.validarUsuario.mockResolvedValue(usuario());
    compare.mockResolvedValue(false);

    await expect(
      service.Login('conductor_test', 'mala'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.sign).not.toHaveBeenCalled();
  });

  // Un usuario con status=false no puede autenticarse aunque la clave sea válida.
  it('rechaza si el usuario esta inactivo', async () => {
    usuariosService.validarUsuario.mockResolvedValue(
      usuario({ status: false }),
    );

    await expect(
      service.Login('conductor_test', 'clave123'),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(jwtService.sign).not.toHaveBeenCalled();
  });
});
