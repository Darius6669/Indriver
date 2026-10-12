import { Module } from '@nestjs/common';
import { IncidenciasService } from './incidencias.service';
import { IncidenciasController } from './incidencias.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IncidenciasEntity } from 'src/entidades/Incidencias.entity';
/**
 * Módulo de incidencias.
 * Registra el repositorio de IncidenciasEntity y expone controlador y servicio.
 */
@Module({
  imports: [TypeOrmModule.forFeature([IncidenciasEntity])],
  controllers: [IncidenciasController],
  providers: [IncidenciasService],
})
export class IncidenciasModule {}
