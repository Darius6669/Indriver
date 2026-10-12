import { Module } from '@nestjs/common';
import { PuntosControlService } from './puntos-control.service';
import { PuntosControlController } from './puntos-control.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ControlRutaEntity } from 'src/entidades/ControlRuta.entity';

/**
 * Módulo de puntos de control.
 * Registra el repositorio de ControlRutaEntity y expone el controlador y servicio.
 */
@Module({
  imports: [TypeOrmModule.forFeature([ControlRutaEntity])],
  controllers: [PuntosControlController],
  providers: [PuntosControlService],
})
export class PuntosControlModule {}
