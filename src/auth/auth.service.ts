import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from 'src/usuarios/usuarios.service';
import { esRolValido, ROLES_VALIDOS } from 'src/Roles/roles.decorador';

/**
 * Servicio de autenticación.
 * Valida credenciales contra la base vía UsuariosService y, si todo es
 * correcto, emite el JWT firmado que usa la API y el WebSocket.
 */
@Injectable()
export class AuthService {
  // Servicio de autenticación
  /**
   * @param usuariosService acceso a los usuarios (validación y datos).
   * @param jwtService servicio de Nest para firmar/verificar tokens JWT.
   */
  constructor(
    private readonly usuariosService: UsuariosService, // Servicio de usuarios
    private readonly jwtService: JwtService,
  ) {} // Servicio de JWT

  /**
   * Valida usuario/contraseña y devuelve el token firmado.
   * Orden: existe -> contraseña -> activo -> rol válido.
   * @throws UnauthorizedException si la contraseña es incorrecta, el usuario
   *   está inactivo o su rol no es uno de los permitidos.
   */
  async Login(username: string, password: string) {
    // Método para iniciar sesión
    // Lanza excepción si el usuario no existe (lo resuelve UsuariosService).
    const usuario = await this.usuariosService.validarUsuario(username); // Valida si el usuario existe uso del servicio de usuarios
    // Compara la contraseña recibida contra el hash almacenado.
    const passwordValida = await bcrypt.compare(password, usuario.contrasena); // Valida si la contraseña es correcta
    if (!passwordValida) {
      throw new UnauthorizedException('Contraseña incorrecta');
    }
    if (!usuario.status) {
      throw new UnauthorizedException(
        'El usuario está inactivo, contacta a un administrador',
      );
    }
    // El rol debe ser uno de los permitidos. Sin esto, una cuenta con rol
    // invalido ("user", vacio, etc.) igual se logueaba y recibia token.
    // Se corta ANTES de firmar: no se emite token a un rol no correspondiente.
    if (!esRolValido(usuario.rol)) {
      throw new UnauthorizedException(
        `El rol "${usuario.rol ?? ''}" no es valido para iniciar sesion. ` +
          `Roles permitidos: ${ROLES_VALIDOS.join(', ')}.`,
      );
    }
    // Payload mínimo que viajará firmado dentro del token.
    const paylod = {
      user_id: usuario.user_id, // Necesario por el socket: para colgar el viaje del chofer sin otra query
      username: usuario.username,
      rol: usuario.rol,
    }; // Crea el payload del token
    const token = this.jwtService.sign(paylod); // Genera el token con el payload y lo firma con la semilla del JWT
    return {
      // Retorna el token y el usuario
      user: username,
      token: token,
    };
  }
}
