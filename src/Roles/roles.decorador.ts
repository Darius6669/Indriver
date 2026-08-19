import { Reflector } from '@nestjs/core';

export type Role = 'Conductor' | 'Administrador' | 'Superadmin';

export const Roles = Reflector.createDecorator<Role[]>();
