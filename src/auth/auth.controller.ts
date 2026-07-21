import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post,UseGuards  } from '@nestjs/common';
import { AuthService } from './auth.service'; // Importa el servicio de autenticación para poder usarlo en el controlador
import { JwtAuthGuard } from './jwt-auth.guard'; // Importa el guardia de autenticación JWT para proteger las rutas todavia no lo estoy usando pero lo usare mas adelante

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

 @Post('/login') // Ruta para iniciar sesión
 @HttpCode(HttpStatus.OK)
 async Login(@Body() login){ // Método para iniciar sesión
  const {username, password} = login; // Desestructuración del objeto login para obtener el nombre de usuario y la contraseña
  const token = await this.authService.Login(username,password)// Llama al método Login del servicio de autenticación para obtener el token
  return{ // Retorna el token y el usuario
    message : "Se ha Logeado Exitosamente el Usuario*",
    control: token
  }

 }

}
