import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Roles } from './roles.decorador';
import { RolesKey } from './constans';

@Injectable()
export class RolesGuard {

}