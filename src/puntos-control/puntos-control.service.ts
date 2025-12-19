import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateRutaControlDto } from 'src/dtos/ControlRutadto/Create_RutaControl.dto';
import { updatePuntoControl } from 'src/dtos/ControlRutadto/UpdateControlRuta.dto';
import { ControlRutaEntity } from 'src/entidades/ControlRuta.entity';
import { Repository } from 'typeorm';

@Injectable()
export class PuntosControlService {
    constructor(@InjectRepository(ControlRutaEntity) private ControlRepository : Repository<ControlRutaEntity> ){}

    async Verificar_Punto_Control(nombre : string): Promise<boolean>{
        const control = await this.ControlRepository.findOne({where:{nombre:nombre}})
        if(control){
            return true;
        }
        else{
            return false;
        }
    }

    async Obtener_Todos_puntos(): Promise <ControlRutaEntity[]>{
        return await this.ControlRepository.find()
    }

    async Crear_Punto_control(CreateRutaControldto : CreateRutaControlDto): Promise<ControlRutaEntity>{
        const control = new  ControlRutaEntity();
        control.nombre = CreateRutaControldto.nombre;
        control.descripcion = CreateRutaControldto.descripcion;
        control.ubicacion = CreateRutaControldto.ubicacion;
        control.lactitud = CreateRutaControldto.lactitud;
        control.longitud = CreateRutaControldto.longitud;
        return this.ControlRepository.save(control)
    }

    async Obtener_Punto_Control_ID(nombre : string):Promise<ControlRutaEntity>{
        const control = await this.ControlRepository.findOne({where:{nombre : nombre }})
        if(!control){
            throw new NotFoundException(`Este Punto de control no se encuentra registrado ${nombre} no encontrado.`)
        }

        return control
    }


    async Eliminar_Punto_control(nombre : string): Promise<ControlRutaEntity>{
        const control = await this.Obtener_Punto_Control_ID(nombre)
        return await this.ControlRepository.remove(control)

    }


    async Actualizar_Punto_Control(UpdatePuntoControl:updatePuntoControl): Promise<ControlRutaEntity>{
        const control = await this.Obtener_Punto_Control_ID(UpdatePuntoControl.nombre);
        const aux = control
        aux.nombre = UpdatePuntoControl.nombre ?? control.nombre
        aux.descripcion = UpdatePuntoControl.descripcion ?? control.descripcion
        aux.ubicacion = UpdatePuntoControl.ubicacion ?? control.ubicacion
        aux.lactitud = UpdatePuntoControl.lactitud ?? control.lactitud
        aux.longitud = UpdatePuntoControl.longitud ?? control.longitud
        return await this.ControlRepository.save(aux)   
    }

}
