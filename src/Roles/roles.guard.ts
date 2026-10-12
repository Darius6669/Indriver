import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, Roles } from './roles.decorador'; // Tu decorador moderno

/**
 * Forma mínima del `request` de Express una vez que `JwtStrategy` ya adjuntó
 * el usuario autenticado. Se tipa aquí para no trabajar con `any`.
 */
interface RequestConUsuario {
  user?: { rol?: string };
}

/**
 * Guard de autorización por roles.
 * Compara el rol del usuario autenticado (req.user.rol) con los roles exigidos
 * por el decorador @Roles en el handler o en la clase.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  /**
   * Lee los roles requeridos y comprueba que el usuario tenga uno de ellos.
   * @throws ForbiddenException si no hay roles definidos en la ruta.
   * @throws UnauthorizedException si no hay usuario autenticado o le falta rol.
   * @returns true si el rol del usuario está entre los permitidos.
   */
  canActivate(context: ExecutionContext): boolean {
    // El decorador puede estar en el método o en la clase; gana el del método.
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(Roles, [
      context.getHandler(),
      context.getClass(),
    ]);
    // Si no hay roles definidos, denegamos el acceso
    if (!requiredRoles || requiredRoles.length === 0) {
      throw new ForbiddenException(
        'Acceso denegado: se requiere un rol específico.',
      );
    }

    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    const user = request.user;
    if (!user || !user.rol) {
      throw new UnauthorizedException('Usuario no autenticado o sin rol.');
    }

    // Verificar si el rol del usuario está en los roles permitidos
    return requiredRoles.some((role) => user.rol === role);
  }
}
