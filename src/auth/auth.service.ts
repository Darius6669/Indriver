import { Injectable,UnauthorizedException  } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsuariosService } from 'src/usuarios/usuarios.service';

@Injectable()
export class AuthService { // Servicio de autenticación
    constructor(private readonly usuariosService: UsuariosService, // Servicio de usuarios
                private readonly jwtService: JwtService){} // Servicio de JWT

    async Login(username: string, password: string){ // Método para iniciar sesión
        const usuario = await this.usuariosService.validarUsuario(username) // Valida si el usuario existe uso del servicio de usuarios
        const passwordValida = await bcrypt.compare(password, usuario.contrasena); // Valida si la contraseña es correcta
        if(!passwordValida){
            throw new UnauthorizedException('Contraseña incorrecta');
        }
        const paylod = {username: usuario.username, rol: usuario.rol} // Crea el payload del token
        const token = this.jwtService.sign(paylod) // Genera el token con el payload y lo firma con la semilla del JWT
        return{ // Retorna el token y el usuario
           user: username,
           token: token
        }
    }

}
