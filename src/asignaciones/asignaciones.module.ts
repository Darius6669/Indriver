import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AsignacionesService } from './asignaciones.service';
import { AsignacionesController } from './asignaciones.controller';
import { UsuariosEntity } from 'src/entidades/Usuarios.entity';
import { VehiculosEntity } from 'src/entidades/vehiculos.entity';
import { RutaEntity } from 'src/entidades/ruta.entity';
import { ViajesEntity } from 'src/entidades/Viajes.entity';
import { AsignacionEntity } from 'src/entidades/asignaciones.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AsignacionEntity,
      UsuariosEntity,
      VehiculosEntity,
      RutaEntity,
      ViajesEntity,
    ]),
  ],
  controllers: [AsignacionesController],
  providers: [AsignacionesService],
})
export class AsignacionesModule {}