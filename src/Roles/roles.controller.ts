import { Controller } from '@nestjs/common';
import { RolesService } from './roles.service';

/**
 * Controlador base del recurso "roles".
 * Actualmente no expone rutas: solo deja inyectado RolesService para uso futuro.
 */
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}
}
