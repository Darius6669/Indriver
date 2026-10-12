import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConstants } from './constans';

/** Lo que va firmado dentro del JWT y se inyecta como req.user. */
interface JwtPayload {
  user_id: number;
  username: string;
  rol: string;
}

/**
 * Estrategia Passport para validar tokens JWT en las rutas HTTP.
 * Extrae el token del header Authorization y, si es válido, adjunta el usuario.
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  // Estrategia de autenticación JWT
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Extrae el token del encabezado de autorización
      ignoreExpiration: false, // Rechaza tokens expirados.
      secretOrKey: jwtConstants.secret, // variable de entorno para la semilla del JWT
    });
  }

  /**
   * Se ejecuta tras verificar la firma del token.
   * Lo que retorne queda disponible como `req.user` en los controladores.
   */
  validate(payload: JwtPayload) {
    // Esto es lo que se inyecta como req.user
    return {
      user_id: payload.user_id,
      username: payload.username,
      rol: payload.rol,
    };
  }
}
