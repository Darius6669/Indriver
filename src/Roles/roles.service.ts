import { Injectable } from '@nestjs/common';

/**
 * Servicio de roles.
 * Aún sin lógica: la validación de roles vive en roles.decorador.ts y
 * RolesGuard. Queda como punto de extensión para futuras reglas de roles.
 */
@Injectable()
export class RolesService {}
