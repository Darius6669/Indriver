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
import { PersonasModule } from './personas/personas.module';
import { IncidenciasModule } from './incidencias/incidencias.module';
import { UsuariosModule } from './usuarios/usuarios.module';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './Roles/roles.module';
/**
 * Módulo raíz de la aplicación.
 * Carga las variables de entorno, establece la conexión a PostgreSQL con
 * TypeORM y agrega todos los módulos funcionales del sistema.
 */
@Module({
  imports: [
    // Carga el archivo .env y expone ConfigService de forma global.
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Conexión única a PostgreSQL; las credenciales vienen del .env.
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.HOST_BD,
      port: process.env.PORT_BD ? parseInt(process.env.PORT_BD) : 5432,
      username: process.env.USER_NAME,
      password: process.env.PASSWORD_BD,
      database: process.env.DB_NAME,
      // Escanea y registra todas las entidades del proyecto.
      entities: [__dirname + '/**/*.entity{.ts,.js}'],
      // false: el esquema se gestiona con migraciones, no automáticamente.
      synchronize: false,
    }),
    WebsocketModule,
    RutasModule,
    CoperativaModule,
    VehiculosModule,
    PuntosControlModule,
    PersonasModule,
    ViajesModule,
    IncidenciasModule,
    UsuariosModule,
    AuthModule,
    RolesModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
