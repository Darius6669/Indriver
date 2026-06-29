import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IncidenciasEntity } from 'src/entidades/Incidencias.entity';
import { ViajesEntity } from 'src/entidades/Viajes.entity';
import { RutaEntity} from 'src/entidades/ruta.entity';
import { UsuariosEntity} from 'src/entidades/Usuarios.entity'
import {VehiculosEntity} from 'src/entidades/vehiculos.entity'
import { CreateViajesDto } from 'src/dtos/viajes/Create_Viajes.dto';
import { UpdateViajesDto } from 'src/dtos/viajes/UpdateViajes.dto';
@Injectable()
export class ViajesService {
    constructor(@InjectRepository(ViajesEntity) private viajesRepository : Repository <ViajesEntity>,
    @InjectRepository(RutaEntity) private rutaRepository : Repository <RutaEntity>,
    @InjectRepository(UsuariosEntity) private usuariosRepository : Repository <UsuariosEntity>,
    @InjectRepository(VehiculosEntity) private vehiculosRepository : Repository <VehiculosEntity>,
    @InjectRepository(IncidenciasEntity)private IncidenciasRepository : Repository <IncidenciasEntity> ){}


    async ValidarRuta(numero_ruta:string): Promise<boolean>{
        const ruta = await this.rutaRepository.findOne({where:{numero_ruta: numero_ruta}})
        if(ruta){
            return true;
        }
        return false;
    }

    async ValidarUser(id_user:number): Promise<boolean>{
        const user = await this.usuariosRepository.findOne({where:{user_id:id_user}})
        if(user){
            return true;
        }
        return false;
    }

     async ValidarVehiculos(placa:string): Promise<boolean>{
        const vehiculo = await this.vehiculosRepository.findOne({where:{placa: placa}})
        if(vehiculo){
            return true;
        }
        return false;
    }

    
     async ValidarIncidencias(incidencias_id:number): Promise<boolean>{
        const incidencias = await this.IncidenciasRepository.findOne({where:{incidencias_id: incidencias_id}})
        if(incidencias){
            return true;
        }
        return false;
    }

    async CreateViajes(createViajesdto: CreateViajesDto): Promise<ViajesEntity> {
       // Validar los campos obligatorios (ruta, usuario, vehículo)
        const rutaValida = await this.ValidarRuta(createViajesdto.id_ruta);
        const userValido = await this.ValidarUser(createViajesdto.id_user);
        const vehiculoValido = await this.ValidarVehiculos(createViajesdto.id_vehiculo);

        if (!rutaValida || !userValido || !vehiculoValido) {
            throw new NotFoundException('Ruta, usuario o vehículo no existen');
        }

        // Validar incidencia solo si existe el campo y no es null/undefined
        if (createViajesdto.incidencia_id !== undefined && 
            createViajesdto.incidencia_id !== null) {
            const incidenciaValida = await this.ValidarIncidencias(createViajesdto.incidencia_id);
            if (!incidenciaValida) {
            throw new NotFoundException('La incidencia no existe');
        }
     }

       
        const viaje = this.viajesRepository.create({
            fecha_inicio: createViajesdto.fecha_inicio,
            fecha_final: createViajesdto.fecha_final,
            lactitud: createViajesdto.lactitud,
            longitud: createViajesdto.longitud,
            usuario: { user_id: createViajesdto.id_user },   
            vehiculo: { placa: createViajesdto.id_vehiculo },
            ruta: { numero_ruta: createViajesdto.id_ruta },
            incidencia: createViajesdto.incidencia_id ? { incidencias_id: createViajesdto.incidencia_id } : null
        });
        const crear = await this.viajesRepository.save(viaje);
        return await this.ObtenerVijesId(crear.id_viaje)
        
    }

    async ObtenerViajes(): Promise<ViajesEntity[]>{
        return await this.viajesRepository.find()
    }

   async ObtenerVijesId(id_viaje: number): Promise<ViajesEntity> {
    const viaje = await this.viajesRepository
        .createQueryBuilder('viaje')
        .leftJoinAndSelect('viaje.usuario', 'usuario')
        .leftJoinAndSelect('viaje.vehiculo', 'vehiculo')
        .leftJoinAndSelect('viaje.ruta', 'ruta')
        .leftJoinAndSelect('viaje.incidencia', 'incidencia')
        .where('viaje.id_viaje = :id_viaje', { id_viaje: id_viaje }).select([
            'viaje.id_viaje',
            'viaje.fecha_inicio',
            'viaje.fecha_final',
            'viaje.lactitud',
            'viaje.longitud',
            'usuario.username',       
            'vehiculo.placa',         
            'ruta.numero_ruta',       
            'ruta.nombre',      
            'incidencia.descripcion' 
        ])
        .getOne();

        if (!viaje) {
            throw new NotFoundException('El viaje a solicitar no se encuentra registrado o vuelva a intentar la búsqueda');
        }
        return viaje;
    }

    async EliminarViajeID(id_viaje : number): Promise<ViajesEntity>{
        return await this.viajesRepository.remove(await this.ObtenerVijesId(id_viaje))

    }

    async ActualizarViaje(id_viaje : number , updateviajeDto : UpdateViajesDto): Promise<ViajesEntity>{
        const viaje = await this.ObtenerVijesId(id_viaje)
        if(viaje){
            viaje.fecha_inicio = updateviajeDto.fecha_inicio ?? viaje.fecha_inicio
            viaje.fecha_final = updateviajeDto.fecha_final ?? viaje.fecha_final
            viaje.lactitud = updateviajeDto.lactitud ?? viaje.lactitud
            viaje.longitud = updateviajeDto.lactitud ?? viaje.longitud
            
            if(updateviajeDto.usuario !== undefined){
                viaje.usuario = { user_id: updateviajeDto.usuario } as UsuariosEntity;
            }

            if(updateviajeDto.id_vehiculo !== undefined){
                viaje.vehiculo = {placa : updateviajeDto.id_vehiculo} as VehiculosEntity
            }

            if(updateviajeDto.id_ruta !== undefined){
                viaje.ruta = {numero_ruta: updateviajeDto.id_ruta} as RutaEntity
            }
            
            if(updateviajeDto.incidencia_id !== undefined){
                viaje.incidencia = {incidencias_id: updateviajeDto.incidencia_id} as IncidenciasEntity 
            }
            const update = await this.viajesRepository.save(viaje)
            return await this.ObtenerVijesId(viaje.id_viaje)
        }
       throw new NotFoundException(`El viaje con id ${id_viaje} no encontrado.`);
    }

}
