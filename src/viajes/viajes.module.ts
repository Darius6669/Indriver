import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ViajesService } from './viajes.service';
import { ViajesController } from './viajes.controller';
import { ViajesEntity } from 'src/entidades/Viajes.entity';
import { UsuariosEntity } from 'src/entidades/Usuarios.entity';
import { IncidenciasEntity } from 'src/entidades/Incidencias.entity';
import { VehiculosEntity } from 'src/entidades/vehiculos.entity';
import { RutaEntity } from 'src/entidades/ruta.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ViajesEntity,UsuariosEntity,IncidenciasEntity,VehiculosEntity,RutaEntity])],
  controllers: [ViajesController],
  providers: [ViajesService],
})
export class ViajesModule {}
