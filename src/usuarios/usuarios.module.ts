import { Module } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsuariosEntity } from 'src/entidades/Usuarios.entity';
import { PersonaEntity } from 'src/entidades/persona.entity';
import { CooperativaEntity } from 'src/entidades/cooperativa.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UsuariosEntity,
      PersonaEntity,
      CooperativaEntity
    ])
  ],
  controllers: [UsuariosController],
  providers: [UsuariosService],
})
export class UsuariosModule {}
