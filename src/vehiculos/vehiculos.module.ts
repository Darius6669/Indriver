import { Module } from '@nestjs/common';
import { VehiculosService } from './vehiculos.service';
import { VehiculosController } from './vehiculos.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VehiculosEntity } from 'src/entidades/vehiculos.entity';
import { CooperativaEntity } from 'src/entidades/cooperativa.entity';

@Module({
  imports: [TypeOrmModule.forFeature([VehiculosEntity,CooperativaEntity])],
  controllers: [VehiculosController],
  providers: [VehiculosService],
})
export class VehiculosModule {}
