import { Reflector } from '@nestjs/core';

/** Unión de los roles válidos del sistema. */
export type Role = 'Conductor' | 'Admin' | 'Superadmin';

/**
 * Decorador @Roles(...) que marca los roles permitidos en un controlador o
 * handler; RolesGuard lo lee vía Reflector para autorizar la petición.
 */
export const Roles = Reflector.createDecorator<Role[]>();

/**
 * Roles que puede tener una cuenta. Un usuario con un rol fuera de esta lista
 * (p.ej. "user") no puede autenticarse: no se le firma token.
 */
export const ROLES_VALIDOS: Role[] = ['Conductor', 'Admin', 'Superadmin'];

/** true si el rol del usuario es uno de los permitidos. */
export function esRolValido(rol: string | null | undefined): rol is Role {
  return typeof rol === 'string' && ROLES_VALIDOS.includes(rol.trim() as Role);
}
