import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateCooperativaDto } from 'src/dtos/cooperativadto/Create_cooperativa.dto';
import { UpdateCooperativaDto } from 'src/dtos/cooperativadto/Updatecooperativa.dto';
import { CooperativaEntity } from 'src/entidades/cooperativa.entity';
import { Repository } from 'typeorm';

@Injectable()
export class CooperativaService {
constructor(@InjectRepository(CooperativaEntity) private cooperativaRepository : Repository<CooperativaEntity> ) { }



    async CrearCooperativa(CreateCooperativadto: CreateCooperativaDto) : Promise<CooperativaEntity> {
        const nuevacooperativa = await this.cooperativaRepository.findOne({where:{rif_cooperativa :CreateCooperativadto.rif_cooperativa}});
        if(nuevacooperativa){
            throw new NotFoundException(`Esta coopertiva ya se encuentra registrada ${CreateCooperativadto.rif_cooperativa} no encontrado.`);
        }
        
        const cooperativa = new CooperativaEntity();
        cooperativa.rif_cooperativa = CreateCooperativadto.rif_cooperativa;
        cooperativa.nombre = CreateCooperativadto.nombre;
        cooperativa.ubicacion = CreateCooperativadto.ubicacion;
        cooperativa.descripcion = CreateCooperativadto.descripcion;
        cooperativa.horario = CreateCooperativadto.horario;
        return this.cooperativaRepository.save(cooperativa);

    }



    async ObtenerCooperativas(): Promise<CooperativaEntity[]> {
        return this.cooperativaRepository.find();
    }


    async ObtenercooperativaPorRif(Rif_cooperativa : string ): Promise<CooperativaEntity>{ 
        const cooperativa = await this.cooperativaRepository.findOne({where :{rif_cooperativa : Rif_cooperativa}});
        if(!cooperativa){
            throw new NotFoundException(`Esta coopertiva no se encuentra registrada ${Rif_cooperativa} no encontrado.`);
        }
        return cooperativa;

    }


    async EliminarCooperativa(rif_cooperativa : string): Promise<CooperativaEntity>{
        const cooperativa = await this.cooperativaRepository.findOne({where :{rif_cooperativa:rif_cooperativa}});
        if(!cooperativa){
            throw new NotFoundException(`Esta coopertiva no se encuentra registrada ${rif_cooperativa} no encontrado.`);
        }  
        return await this.cooperativaRepository.remove(cooperativa);
    }


    async ActualizarCooperativa(rif_cooperativa : string ,UpdateCooperativadto: UpdateCooperativaDto): Promise<CooperativaEntity>{
        const cooperativa = await this.cooperativaRepository.findOne({where :{rif_cooperativa:UpdateCooperativadto.rif_cooperativa}});
        if(!cooperativa){
            throw new NotFoundException(`Esta coopertiva no se encuentra registrada ${UpdateCooperativadto.rif_cooperativa} no encontrado.`);
        }
        const upadte = cooperativa;
        upadte.rif_cooperativa = UpdateCooperativadto.rif_cooperativa ?? cooperativa.rif_cooperativa;
        upadte.nombre = UpdateCooperativadto.nombre ?? cooperativa.nombre;
        upadte.ubicacion = UpdateCooperativadto.ubicacion??cooperativa.ubicacion;
        upadte.descripcion = UpdateCooperativadto.descripcion??cooperativa.descripcion;
        upadte.horario = UpdateCooperativadto.horario?? cooperativa.horario;
        return this.cooperativaRepository.save(cooperativa);
    }

}
