import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreatePersonaDto } from 'src/dtos/personadto/Create_persona.dto';
import { UpdatePersonaDto } from 'src/dtos/personadto/Updatedto_Persona.dto';
import {PersonaEntity } from 'src/entidades/persona.entity';
import {Repository} from 'typeorm'; 
@Injectable()
export class PersonasService {
    constructor(@InjectRepository(PersonaEntity) private personasRepository : Repository<PersonaEntity> ) { }


    async ValidarCedula(cedula:string): Promise<boolean>{
        const persona = await this.personasRepository.findOne({where:{cedula:cedula}});
        if(persona){
            return true;
        }
        return false;
    }

    async Crear_Persona(createPersonaDto: CreatePersonaDto): Promise<PersonaEntity> {
        if(await this.ValidarCedula(createPersonaDto.cedula)){
            throw new NotFoundException(`Esta  ${createPersonaDto.cedula} ya existe.`);
        }
        const persona = this.personasRepository.create(createPersonaDto);
        
        return this.personasRepository.save(persona);
    } 
    
    async ObtenerPersonas(): Promise<PersonaEntity[]>{
        return this.personasRepository.find();
    }


    async ObtenerPersonaPorId(cedula: string): Promise<PersonaEntity>{
        const persona = await this.personasRepository.findOne({where:{cedula:cedula}});
        if(!persona){
            throw new NotFoundException(`Esta  ${cedula} no encontrado.`);
        }
        return persona;
    }

    async eliminarPersona(cedula: string): Promise <PersonaEntity>{
       return await this.personasRepository.remove(await this.ObtenerPersonaPorId(cedula));
    }


    async ActualizarPersona(cedula: string, UpdatePersonaDto: UpdatePersonaDto):Promise<PersonaEntity>{
       const persona = await this.ObtenerPersonaPorId(cedula);
       if(persona){
            persona.nombre = UpdatePersonaDto.nombre ?? persona.nombre;
            persona.apellido = UpdatePersonaDto.apellido ?? persona.apellido;
            persona.edad = UpdatePersonaDto.edad ?? persona.edad;
            persona.email = UpdatePersonaDto.email ?? persona.email;
            persona.telefono = UpdatePersonaDto.telefono ?? persona.telefono;
            return this.personasRepository.save(persona);
       }
       throw new NotFoundException(`Persona con cédula ${cedula} no encontrada.`);
    }

    
}
