import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { WebsocketModule } from './websocket/websocket.module';
import { RutasModule } from './rutas/rutas.module';
import { CoperativaModule } from './coperativa/coperativa.module';
import { VehiculosModule } from './vehiculos/vehiculos.module';
import { PuntosControlModule } from './puntos-control/puntos-control.module';
import { ViajesModule } from './viajes/viajes.module';

@Module({
  imports: [  ConfigModule.forRoot({
    isGlobal: true,
    envFilePath: '.env',
  }),
    TypeOrmModule.forRoot({
    type: 'postgres',
    host: process.env.HOST_BD,
    port: process.env.PORT_BD ? parseInt(process.env.PORT_BD) : 5432,
    username:process.env.USER_NAME,
    password : process.env.PASSWORD_BD,
    database : process.env.DB_NAME,
    entities: [__dirname + '/**/*.entity{.ts,.js}'],
    synchronize : false
  }),
    WebsocketModule,
    RutasModule,
    CoperativaModule,
    VehiculosModule,
    PuntosControlModule,
    ViajesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
