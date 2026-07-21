import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUsuarioDTO } from 'src/dtos/usuarios/Create_usuario.dto';
import { UpdateUsuarioDTO } from 'src/dtos/usuarios/Update_usuario.dto';
import { UsuariosEntity } from 'src/entidades/Usuarios.entity';
import { PersonaEntity } from 'src/entidades/persona.entity';
import { CooperativaEntity } from 'src/entidades/cooperativa.entity';
import * as bcrypt from 'bcrypt'

@Injectable()
export class UsuariosService {
    constructor(@InjectRepository(UsuariosEntity) private usuariosRepository: Repository<UsuariosEntity>,
    @InjectRepository(PersonaEntity) private personaRepository: Repository<PersonaEntity>,
    @InjectRepository(CooperativaEntity) private cooperativaRepository: Repository<CooperativaEntity>){}

    async ValidarPersona(cedula: string): Promise<PersonaEntity>{
        const persona = await this.personaRepository.findOne({where:{cedula:cedula}})
        if(!persona){
            throw new NotFoundException(`La persona con cédula ${cedula} no esta registrada.`);
        }
        return persona;
    }

    async ValidarCooperativa(rif_cooperativa: string): Promise<CooperativaEntity>{
        const cooperativa = await this.cooperativaRepository.findOne({where:{rif_cooperativa:rif_cooperativa}})
        if(!cooperativa){
            throw new NotFoundException(`La cooperativa con rif ${rif_cooperativa} no esta registrada.`);
        }
        return cooperativa;
    }

    async validarUsuario(username: string): Promise<UsuariosEntity>{
        const usuario = await this.usuariosRepository.findOne({where:{username:username}})
        if(!usuario){
            throw new HttpException(`El usuario con username ${username} no esta registrado.`,404);
        }
        return usuario;
    }

    async EncriptarPassword(password: string): Promise<string>{
        const salto = await bcrypt.genSalt(10);
        const contrasenaEncriptada = await bcrypt.hash(password, salto);
        return contrasenaEncriptada;
    }



    async CreateUsuario(createUsuarioDTO: CreateUsuarioDTO): Promise<UsuariosEntity> {
        const persona = await this.ValidarPersona(createUsuarioDTO.cedula_id);
        const cooperativa = await this.ValidarCooperativa(createUsuarioDTO.cooperativa_id);
        const Existe = await this.validarUsuario(createUsuarioDTO.username);
        if(Existe){
            throw new NotFoundException(`El usuario con username ${createUsuarioDTO.username} ya esta registrado tambien podria usar su correo electronico.`);
        }
        else{
            if(persona && cooperativa){
                const Usuario = new UsuariosEntity();
                Usuario.username = createUsuarioDTO.username;
                Usuario.contrasena = await this.EncriptarPassword(createUsuarioDTO.contrasena);
                Usuario.rol = createUsuarioDTO.rol;
                Usuario.status = true;
                Usuario.persona = persona;
                Usuario.cooperativa = cooperativa;
                return this.usuariosRepository.save(Usuario);
            }
            else{
                throw new NotFoundException(`La persona con cédula ${createUsuarioDTO.cedula_id} o la cooperativa con rif ${createUsuarioDTO.cooperativa_id} no estan registradas.`);
            }
        }  

    }

    async ObtenerUsuarios():Promise<UsuariosEntity[]>{
        return this.usuariosRepository.find();
    }

    async ObtenerUsuarioUsername(username: string):Promise<UsuariosEntity>{
        const usuario = await this.usuariosRepository.findOne({where:{username:username}});
        if(!usuario){
            throw new NotFoundException(`El usuario con username ${username} no esta registrado.`);
        }
        return usuario;
    }
    
    async eliminarUsuario(username: string):Promise<UsuariosEntity>{
        return this.usuariosRepository.remove(await this.ObtenerUsuarioUsername(username));

    }

    async actualizarUsuario(username: string, updateusuarioDTO: UpdateUsuarioDTO):Promise<UsuariosEntity>{
        const existeUsuario = await this.ObtenerUsuarioUsername(username);
        if(!existeUsuario){
            throw new NotFoundException(`El usuario con username ${username} no esta registrado.`);
        }
        else{
            if(updateusuarioDTO.contrasena){
                const pass = await this.EncriptarPassword(updateusuarioDTO.contrasena);
                existeUsuario.contrasena = pass ?? existeUsuario.contrasena;
            }
            existeUsuario.username = updateusuarioDTO.username ?? existeUsuario.username;
            existeUsuario.status = updateusuarioDTO.status ?? existeUsuario.status;
            if(updateusuarioDTO.cedula_id && updateusuarioDTO.cooperativa_id){
                const persona = await this.ValidarPersona(updateusuarioDTO.cedula_id);
                const cooperativa = await this.ValidarCooperativa(updateusuarioDTO.cooperativa_id);
                existeUsuario.persona = persona;
                existeUsuario.cooperativa = cooperativa;
            }
            else{
                throw new NotFoundException(`La persona con cédula ${updateusuarioDTO.cedula_id} o la cooperativa con rif ${updateusuarioDTO.cooperativa_id} no estan registradas.`);
            }
            
            const update = await this.usuariosRepository.save(existeUsuario);
            return await this.ObtenerUsuarioUsername(update.username);
        }

    }
        
}
    

    


