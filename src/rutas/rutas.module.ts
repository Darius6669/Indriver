import { Module } from '@nestjs/common';
import { RutasService } from './rutas.service';
import { RutasController } from './rutas.controller';
import { RutaEntity } from 'src/entidades/ruta.entity';
import { CooperativaEntity } from 'src/entidades/cooperativa.entity';
import { ControlRutaEntity } from 'src/entidades/ControlRuta.entity';
import { TypeOrmModule } from '@nestjs/typeorm';

/**
 * Módulo de rutas.
 * Registra los repositorios de rutas, cooperativas y puntos de control que
 * necesita el servicio, y expone su controlador.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([
      RutaEntity,
      CooperativaEntity,
      ControlRutaEntity,
    ]),
  ],
  controllers: [RutasController],
  providers: [RutasService],
})
export class RutasModule {}
