import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';

/** Módulo que agrupa el controlador y el servicio de roles. */
@Module({
  controllers: [RolesController],
  providers: [RolesService],
})
export class RolesModule {}
