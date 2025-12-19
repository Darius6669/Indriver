import { Injectable, NotFoundException, Version } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { CreateVehiculosDto } from 'src/dtos/vehiculosdto/Create_Vehiculos.dto';
import { UpdateVehiculoDto } from 'src/dtos/vehiculosdto/UpdateVehiculodto.dto';
import { CooperativaEntity } from 'src/entidades/cooperativa.entity';
import { VehiculosEntity } from 'src/entidades/vehiculos.entity';
import { Repository } from 'typeorm';

@Injectable()
export class VehiculosService {
constructor(@InjectRepository(VehiculosEntity) private vehiculoRepository : Repository<VehiculosEntity>,
@InjectRepository(CooperativaEntity) private CooperativaRepository : Repository<CooperativaEntity>
) {}

    async ObtenerVehiculos(): Promise<VehiculosEntity[]> {
        return this.vehiculoRepository.find({relations:['cooperativa']});
    }

    async ObtenerVehiculoPorId(placa: string): Promise<VehiculosEntity> {
        const vehiculo = await this.vehiculoRepository.findOne({where:{placa},relations:['cooperativa']});
        if(!vehiculo){
            throw new NotFoundException(`Vehiculo ${placa} no encontrada.`);
        }
        return vehiculo;
    }


    async verificarVehiculo(placa: string): Promise<boolean> {
        const vehiculo = await this.vehiculoRepository.findOne({where:{placa}});
        return !! vehiculo;
    }


    async verificarCooperativa(rif_cooperativa: string): Promise<CooperativaEntity> {

        const cooperativa = await this.CooperativaRepository.findOne({where:{rif_cooperativa}});
        if(!cooperativa){
            throw new NotFoundException(`Cooperativa con rif ${rif_cooperativa} no encontrada.`);
        }
        return cooperativa;
    }    

    async RegistrarVehiculo(CreateVehiculodto:CreateVehiculosDto): Promise<VehiculosEntity> {
        const placa = await this.verificarVehiculo(CreateVehiculodto.placa);
        const cooperativa = await this.verificarCooperativa(CreateVehiculodto.cooperativa_id);

        if(placa){
            throw new NotFoundException(`Vehiculo con placa ${CreateVehiculodto.placa} ya registrado.`);
        }
        const nuevoVehiculo = new VehiculosEntity();
        nuevoVehiculo.placa = CreateVehiculodto.placa;
        nuevoVehiculo.modelo = CreateVehiculodto.modelo;
        nuevoVehiculo.color = CreateVehiculodto.color;
        nuevoVehiculo.anofabricacion = CreateVehiculodto.anofabricacion;
        nuevoVehiculo.cooperativa = cooperativa;
        return this.vehiculoRepository.save(nuevoVehiculo);

    }


    async EliminarVehiculo(placa:string): Promise<VehiculosEntity>{
        const vehiculo = await this.ObtenerVehiculoPorId(placa);
        return this.vehiculoRepository.remove(vehiculo);
           
    }


    async ActualizarVehiculo(placa : string, updateVehiculodto:UpdateVehiculoDto): Promise<VehiculosEntity>{
       
        if(updateVehiculodto.placa && updateVehiculodto.placa !== placa){
            const placaExiste = await this.verificarVehiculo(updateVehiculodto.placa);
            if(placaExiste){
                throw new NotFoundException(`Vehiculo con placa ${updateVehiculodto.placa} ya registrado.`);
            }

        

            await this.vehiculoRepository.update(placa, { placa: updateVehiculodto.placa });
            placa = updateVehiculodto.placa;
        }
        

        const vehiculo = await this.ObtenerVehiculoPorId(placa);

         if(updateVehiculodto.cooperativa_id){
            const cooperativa = await this.verificarCooperativa(updateVehiculodto.cooperativa_id);
            vehiculo.cooperativa = cooperativa;  
            delete updateVehiculodto.cooperativa_id;
        }
           
         vehiculo.modelo = updateVehiculodto.modelo ?? vehiculo.modelo;
         vehiculo.color = updateVehiculodto.color ?? vehiculo.color;
         vehiculo.anofabricacion = updateVehiculodto.anofabricacion ?? vehiculo.anofabricacion;
         return this.vehiculoRepository.save(vehiculo);
        
    }

}
