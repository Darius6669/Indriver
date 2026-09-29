import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ViajesService } from './viajes.service';
import { ViajesController } from './viajes.controller';
import { ViajesEntity } from 'src/entidades/Viajes.entity';
import { UsuariosEntity } from 'src/entidades/Usuarios.entity';
import { IncidenciasEntity } from 'src/entidades/Incidencias.entity';
import { VehiculosEntity } from 'src/entidades/vehiculos.entity';
import { RutaEntity } from 'src/entidades/ruta.entity';
import { ViajeUbicacionEntity } from 'src/entidades/ViajeUbicacion.entity';
import { WebsocketModule } from 'src/websocket/websocket.module';

@Module({
  imports: [
    // Para inyectar WebsocketService y enricher "buses cercanos" con la
    // posicion en vivo. Solo en este sentido: WebsocketModule NO importa
    // ViajesModule, asi que no hay ciclo.
    WebsocketModule,
    TypeOrmModule.forFeature([
      ViajesEntity,
      UsuariosEntity,
      IncidenciasEntity,
      VehiculosEntity,
      RutaEntity,
      ViajeUbicacionEntity,
    ]),
  ],
  controllers: [ViajesController],
  providers: [ViajesService],
  exports: [ViajesService],
})
export class ViajesModule {}
