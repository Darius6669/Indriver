import { Module } from '@nestjs/common';
import { JwtModule, JwtSignOptions } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsuariosModule } from 'src/usuarios/usuarios.module';
import { jwtConstants } from './constans';

/**
 * Módulo de autenticación.
 * Registra la estrategia JWT, el servicio de auth y el login, y configura
 * JwtModule con el secreto y la expiración tomados de las constantes.
 */
@Module({
  imports: [
    UsuariosModule, // Importa el módulo de usuarios para poder usar el servicio de usuarios
    PassportModule, // Importa el módulo de Passport para la autenticación
    JwtModule.register({
      // Configura el módulo de JWT
      secret: jwtConstants.secret, // variable de entorno para la semilla del JWT
      signOptions: {
        // 24h por defecto: el telefono debe aguantar un turno completo
        expiresIn: jwtConstants.expiresIn as JwtSignOptions['expiresIn'],
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  // Se exporta JwtModule para que WebsocketModule pueda verificar el token
  // en el handshake del socket sin duplicar la configuracion del secreto.
  exports: [JwtModule],
})
export class AuthModule {}
