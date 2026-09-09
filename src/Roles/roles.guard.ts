import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role, Roles } from './roles.decorador'; // Tu decorador moderno

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(Roles, [context.getHandler(),context.getClass(),]);
        // Si no hay roles definidos, denegamos el acceso
        if (!requiredRoles || requiredRoles.length === 0) {
            throw new ForbiddenException('Acceso denegado: se requiere un rol específico.');
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;
        if (!user || !user.rol) {
            throw new UnauthorizedException('Usuario no autenticado o sin rol.');
        }

        // Verificar si el rol del usuario está en los roles permitidos
        return requiredRoles.some((role) => user.rol === role);
    }
}