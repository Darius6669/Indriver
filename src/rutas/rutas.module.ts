import { Module } from '@nestjs/common';
import { RutasService } from './rutas.service';
import { RutasController } from './rutas.controller';
import { RutaEntity } from 'src/entidades/ruta.entity';
import { CooperativaEntity } from 'src/entidades/cooperativa.entity';
import { ControlRutaEntity } from 'src/entidades/ControlRuta.entity';
import { RutaParadaEntity } from 'src/entidades/ruta-parada.entity'; // <-- NUEVO
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RutaEntity,
      CooperativaEntity,
      ControlRutaEntity,
      RutaParadaEntity,
    ]),
  ],
  controllers: [RutasController],
  providers: [RutasService],
})
export class RutasModule {}