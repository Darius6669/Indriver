import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service'; // Importa el servicio de autenticación para poder usarlo en el controlador

/** Controlador de autenticación: expone el login que devuelve el JWT. */
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login -> valida credenciales y devuelve el token.
   * Se responde 200 (no 201) porque el login no crea un recurso.
   */
  @Post('/login') // Ruta para iniciar sesión
  @HttpCode(HttpStatus.OK)
  async Login(@Body() login: { username: string; password: string }) {
    // Método para iniciar sesión
    const { username, password } = login; // Desestructuración del objeto login para obtener el nombre de usuario y la contraseña
    const token = await this.authService.Login(username, password); // Llama al método Login del servicio de autenticación para obtener el token
    return {
      // Retorna el token y el usuario
      message: 'Se ha Logeado Exitosamente el Usuario*',
      control: token,
    };
  }
}
