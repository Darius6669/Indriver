import { Reflector } from '@nestjs/core';

export type Role = 'Conductor' | 'Admin' | 'Superadmin';

export const Roles = Reflector.createDecorator<Role[]>();
