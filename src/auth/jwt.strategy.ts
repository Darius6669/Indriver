import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConstants } from './constans';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) { // Estrategia de autenticación JWT
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),// Extrae el token del encabezado de autorización
      ignoreExpiration: false,
      secretOrKey: jwtConstants.secret, // variable de entorno para la semilla del JWT
    });
  }

  async validate(payload: any) {
    // Esto es lo que se inyecta como req.user
    return { 
      username: payload.username, 
      role: payload.role 
    };
  }
}