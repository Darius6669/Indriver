import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IncidenciasEntity } from 'src/entidades/Incidencias.entity';
import { CreateIncidenciasDto } from 'src/dtos/indenciasdto/Create_incidencias.dto';
import { UpdateIncidenciasDto } from 'src/dtos/indenciasdto/Update_incidencias.dto';

@Injectable()
export class IncidenciasService {
    constructor(@InjectRepository(IncidenciasEntity) private incidenciasRepository : Repository<IncidenciasEntity>){}

    async CrearIncidencia(createIncidenciasDto:CreateIncidenciasDto): Promise<IncidenciasEntity>{
        const Incidencias = await this.incidenciasRepository.create(createIncidenciasDto);
        return this.incidenciasRepository.save(Incidencias);

    }

    async VerificarId(id : number): Promise<boolean>{
        const Incidencias = await this.incidenciasRepository.findOne({where:{incidencias_id: id}})
        if(Incidencias){
            return true;
        }
        return false;
    }

    async ObtenerIncidencias(): Promise<IncidenciasEntity[]>{
        return await this.incidenciasRepository.find();
    }

    async ObtenerIncidenciasId(id : number): Promise<IncidenciasEntity>{
        const Incidencias = await this.incidenciasRepository.findOne({where:{incidencias_id: id}});
        if(!Incidencias){
            throw new NotFoundException(`Incidencia con id ${id} no encontrada.`);
        }
        return Incidencias;
    }

    async EliminarIncidencia(id : number): Promise<IncidenciasEntity>{
        return await this.incidenciasRepository.remove(await this.ObtenerIncidenciasId(id));
    }

    async ActualizarIncidencias( id : number, updateIncidenciasDto: UpdateIncidenciasDto): Promise<IncidenciasEntity>{
        const Incidencias = await this.ObtenerIncidenciasId(id);
        if(Incidencias){
            Incidencias.descripcion = updateIncidenciasDto.descripcion ?? Incidencias.descripcion;
            Incidencias.estado = updateIncidenciasDto.estado ?? Incidencias.estado;
            return await this.incidenciasRepository.save(Incidencias);
        }
        throw new NotFoundException(`Incidencia con id ${id} no encontrada.`);
    }
}
