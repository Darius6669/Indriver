import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsuariosModule } from 'src/usuarios/usuarios.module';
import { jwtConstants } from './constans';

@Module({
  imports: [
    UsuariosModule, // Importa el módulo de usuarios para poder usar el servicio de usuarios
    PassportModule, // Importa el módulo de Passport para la autenticación
    JwtModule.register({
      // Configura el módulo de JWT
      secret: jwtConstants.secret, // variable de entorno para la semilla del JWT
      signOptions: { expiresIn: jwtConstants.expiresIn as any }, // 24h por defecto: el telefono debe aguantar un turno completo
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  // Se exporta JwtModule para que WebsocketModule pueda verificar el token
  // en el handshake del socket sin duplicar la configuracion del secreto.
  exports: [JwtModule],
})
export class AuthModule {}
