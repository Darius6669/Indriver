import { Module } from '@nestjs/common';
import { PuntosControlService } from './puntos-control.service';
import { PuntosControlController } from './puntos-control.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ControlRutaEntity } from 'src/entidades/ControlRuta.entity';

@Module({
  imports:[TypeOrmModule.forFeature([ControlRutaEntity])],
  controllers: [PuntosControlController],
  providers: [PuntosControlService],
})
export class PuntosControlModule {}
