import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from 'src/auth/auth.module';
import { ViajesEntity } from 'src/entidades/Viajes.entity';
import { ViajeUbicacionEntity } from 'src/entidades/ViajeUbicacion.entity';
import { RutaEntity } from 'src/entidades/ruta.entity';
import { VehiculosEntity } from 'src/entidades/vehiculos.entity';
import { UsuariosEntity } from 'src/entidades/Usuarios.entity';
import { WebsocketService } from './websocket.service';
import { WebsocketGateway } from './websocket.gateway';

/**
 * Modulo de WebSocket: tracking en tiempo real.
 *
 * Importa AuthModule para reutilizar el JwtModule ya configurado (mismo secreto
 * que /auth/login) y registra las entidades que consulta el tracking en memoria
 * (viaje, viaje_ubicacion, ruta, vehiculo, usuario).
 *
 * El servicio se exporta para que ViajesModule pueda enriquecer "buses
 * cercanos" con las posiciones vivas. La dependencia es en un solo sentido:
 * este modulo NO importa ViajesModule, asi que no hay ciclo.
 */
@Module({
  imports: [
    // Trae JwtModule configurado (mismo secreto que /auth/login).
    AuthModule,
    TypeOrmModule.forFeature([
      ViajesEntity,
      ViajeUbicacionEntity,
      RutaEntity,
      VehiculosEntity,
      UsuariosEntity,
    ]),
  ],
  providers: [WebsocketGateway, WebsocketService],
  exports: [WebsocketService],
})
export class WebsocketModule {}
