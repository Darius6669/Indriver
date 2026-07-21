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
    UsuariosModule,// Importa el módulo de usuarios para poder usar el servicio de usuarios
    PassportModule, // Importa el módulo de Passport para la autenticación
    JwtModule.register({ // Configura el módulo de JWT
      secret: jwtConstants.secret, // variable de entorno para la semilla del JWT
      signOptions: { expiresIn: '1h' },// Tiempo de vida del token mas adelante le pondre 24 horas
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
})
export class AuthModule {}
