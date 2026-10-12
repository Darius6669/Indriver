import { Module } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosEntity } from 'src/entidades/Usuarios.entity';
import { PersonaEntity } from 'src/entidades/persona.entity';
import { CooperativaEntity } from 'src/entidades/cooperativa.entity';

/**
 * Módulo de usuarios. Registra las entidades que usa el servicio como
 * repositorios inyectables y expone el controlador. UsuariosService se exporta
 * para que otros módulos (p. ej. autenticación) puedan reutilizarlo.
 */
@Module({
  imports: [
    // Registra los repositorios de las entidades que consume UsuariosService.
    TypeOrmModule.forFeature([
      UsuariosEntity,
      PersonaEntity,
      CooperativaEntity,
    ]),
  ],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
